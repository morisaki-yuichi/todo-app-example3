from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import Todo, User


def create_todo(session: Session, user: User, title: str = "消される運命") -> Todo:
    todo = Todo(title=title, user_id=user.id)
    session.add(todo)
    session.commit()
    session.refresh(todo)
    return todo


def test_delete_returns_204_with_empty_body(
    auth_client: TestClient, session: Session, user: User
) -> None:
    todo = create_todo(session, user)

    response = auth_client.delete(f"/todos/{todo.id}")

    assert response.status_code == 204
    assert response.content == b""  # No Content = 本文なし


def test_deleted_todo_is_gone(
    auth_client: TestClient, session: Session, user: User
) -> None:
    todo = create_todo(session, user)

    auth_client.delete(f"/todos/{todo.id}")

    assert auth_client.get(f"/todos/{todo.id}").status_code == 404
    # 2回目の削除も 404（もう存在しないものは消せない）
    assert auth_client.delete(f"/todos/{todo.id}").status_code == 404


def test_delete_not_found(auth_client: TestClient) -> None:
    assert auth_client.delete("/todos/9999").status_code == 404


def test_delete_does_not_affect_others(
    auth_client: TestClient, session: Session, user: User
) -> None:
    keep = create_todo(session, user, title="残るほう")
    victim = create_todo(session, user, title="消えるほう")

    auth_client.delete(f"/todos/{victim.id}")

    body = auth_client.get("/todos").json()
    assert body["total"] == 1
    assert body["items"][0]["title"] == "残るほう"
