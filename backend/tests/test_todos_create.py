from fastapi.testclient import TestClient


def test_create_todo_returns_201_and_body(client: TestClient) -> None:
    response = client.post(
        "/todos",
        json={
            "title": "牛乳を買う",
            "description": "低脂肪",
            "due_date": "2026-07-10",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["id"] is not None
    assert body["title"] == "牛乳を買う"
    assert body["description"] == "低脂肪"
    assert body["due_date"] == "2026-07-10"
    assert body["completed"] is False  # 指定しなければ false
    assert body["created_at"] is not None


def test_create_todo_persists(client: TestClient) -> None:
    created = client.post("/todos", json={"title": "保存確認"}).json()

    fetched = client.get(f"/todos/{created['id']}")

    assert fetched.status_code == 200
    assert fetched.json()["title"] == "保存確認"


def test_create_todo_minimal(client: TestClient) -> None:
    # title だけで作成できる（description / due_date は任意）
    response = client.post("/todos", json={"title": "最小構成"})

    assert response.status_code == 201
    body = response.json()
    assert body["description"] is None
    assert body["due_date"] is None


def test_create_todo_allows_past_due_date(client: TestClient) -> None:
    # 過去日を許可するのは仕様（「昨日やるはずだった」を登録できる）
    response = client.post(
        "/todos", json={"title": "過去日", "due_date": "2020-01-01"}
    )

    assert response.status_code == 201


def test_create_todo_missing_title_is_422(client: TestClient) -> None:
    response = client.post("/todos", json={"description": "タイトルなし"})

    assert response.status_code == 422
    error = response.json()["detail"][0]
    assert error["loc"] == ["body", "title"]  # どこが
    assert error["type"] == "missing"  # なぜ


def test_create_todo_empty_title_is_422(client: TestClient) -> None:
    response = client.post("/todos", json={"title": ""})

    assert response.status_code == 422


def test_create_todo_title_boundary(client: TestClient) -> None:
    # 境界値: 100文字は通り、101文字は落ちる
    assert client.post("/todos", json={"title": "あ" * 100}).status_code == 201
    response = client.post("/todos", json={"title": "あ" * 101})
    assert response.status_code == 422
    error = response.json()["detail"][0]
    assert error["loc"] == ["body", "title"]
    assert error["type"] == "string_too_long"


def test_create_todo_description_boundary(client: TestClient) -> None:
    assert (
        client.post(
            "/todos", json={"title": "境界", "description": "い" * 1000}
        ).status_code
        == 201
    )
    assert (
        client.post(
            "/todos", json={"title": "境界", "description": "い" * 1001}
        ).status_code
        == 422
    )


def test_create_todo_invalid_due_date_is_422(client: TestClient) -> None:
    response = client.post(
        "/todos", json={"title": "日付不正", "due_date": "2026-13-45"}
    )

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", "due_date"]
