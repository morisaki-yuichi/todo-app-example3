from fastapi.testclient import TestClient

ALICE = {"email": "alice@example.com", "password": "password123"}


def register(client: TestClient, **overrides) -> object:
    return client.post("/auth/register", json={**ALICE, **overrides})


def test_register_returns_201_without_password(client: TestClient) -> None:
    response = register(client)

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "alice@example.com"
    assert "id" in body
    # パスワード（ハッシュ含む）はレスポンスに出さない
    assert "password" not in body
    assert "password_hash" not in body


def test_register_logs_user_in(client: TestClient) -> None:
    register(client)

    # 登録直後から /auth/me が通る（自動ログイン）
    response = client.get("/auth/me")

    assert response.status_code == 200
    assert response.json()["email"] == "alice@example.com"


def test_register_duplicate_email_is_409(client: TestClient) -> None:
    register(client)

    response = register(client, password="different9999")

    assert response.status_code == 409


def test_register_invalid_email_is_422(client: TestClient) -> None:
    response = register(client, email="not-an-email")

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", "email"]


def test_register_short_password_is_422(client: TestClient) -> None:
    # 境界値: 8文字は通り、7文字は落ちる
    assert register(client, password="a" * 8).status_code == 201
    response = register(client, email="second@example.com", password="a" * 7)
    assert response.status_code == 422


def test_login_success(client: TestClient) -> None:
    register(client)
    client.post("/auth/logout")

    response = client.post("/auth/login", json=ALICE)

    assert response.status_code == 200
    assert client.get("/auth/me").status_code == 200


def test_login_failures_share_same_message(client: TestClient) -> None:
    register(client)
    client.post("/auth/logout")

    wrong_password = client.post(
        "/auth/login", json={**ALICE, "password": "wrongwrong"}
    )
    unknown_email = client.post(
        "/auth/login", json={"email": "ghost@example.com", "password": "password123"}
    )

    # 「未登録メール」と「パスワード違い」が区別できると
    # 攻撃者に登録済みメールアドレスの一覧を推測されるため、応答を揃える
    assert wrong_password.status_code == unknown_email.status_code == 401
    assert wrong_password.json() == unknown_email.json()


def test_logout_invalidates_session(client: TestClient) -> None:
    register(client)

    response = client.post("/auth/logout")

    assert response.status_code == 204
    assert client.get("/auth/me").status_code == 401


def test_me_requires_login(client: TestClient) -> None:
    assert client.get("/auth/me").status_code == 401
