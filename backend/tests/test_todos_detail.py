from datetime import date

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import Todo, User


def test_get_todo_returns_all_fields(
    auth_client: TestClient, session: Session, user: User
) -> None:
    todo = Todo(
        title="牛乳を買う",
        description="低脂肪",
        due_date=date(2026, 7, 10),
        user_id=user.id,
    )
    session.add(todo)
    session.commit()
    session.refresh(todo)

    response = auth_client.get(f"/todos/{todo.id}")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == todo.id
    assert body["title"] == "牛乳を買う"
    assert body["description"] == "低脂肪"
    assert body["due_date"] == "2026-07-10"
    assert body["completed"] is False
    assert "created_at" in body
    assert "updated_at" in body


def test_get_todo_not_found(auth_client: TestClient) -> None:
    response = auth_client.get("/todos/9999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Todo not found"}


def test_get_todo_invalid_id_type(auth_client: TestClient) -> None:
    # パスパラメータの型（int）に合わない場合は Pydantic が 422 を返す
    response = auth_client.get("/todos/abc")

    assert response.status_code == 422
