from datetime import timedelta

from fastapi.testclient import TestClient

from app.security import create_access_token

ALICE = {"email": "alice@example.com", "password": "password123"}


def register(client: TestClient, **overrides) -> object:
    return client.post("/auth/register", json={**ALICE, **overrides})


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_register_returns_token_and_user(client: TestClient) -> None:
    response = register(client)

    assert response.status_code == 201
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["email"] == "alice@example.com"
    # パスワード（ハッシュ含む）はレスポンスに出さない
    assert "password" not in body["user"]
    assert "password_hash" not in body["user"]


def test_register_token_is_immediately_usable(client: TestClient) -> None:
    token = register(client).json()["access_token"]

    response = client.get("/auth/me", headers=auth_header(token))

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


def test_login_returns_usable_token(client: TestClient) -> None:
    register(client)

    response = client.post("/auth/login", json=ALICE)

    assert response.status_code == 200
    token = response.json()["access_token"]
    assert client.get("/auth/me", headers=auth_header(token)).status_code == 200


def test_login_failures_share_same_message(client: TestClient) -> None:
    register(client)

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


def test_me_requires_token(client: TestClient) -> None:
    assert client.get("/auth/me").status_code == 401


def test_me_rejects_tampered_token(client: TestClient) -> None:
    token = register(client).json()["access_token"]
    tampered = token[:-4] + ("AAAA" if not token.endswith("AAAA") else "BBBB")

    response = client.get("/auth/me", headers=auth_header(tampered))

    assert response.status_code == 401


def test_me_rejects_expired_token(client: TestClient, session, user) -> None:
    expired = create_access_token(user.id, expires_in=timedelta(seconds=-1))

    response = client.get("/auth/me", headers=auth_header(expired))

    assert response.status_code == 401