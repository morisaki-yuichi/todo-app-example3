from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import Todo


def create_todo(session: Session, title: str = "消される運命") -> Todo:
    todo = Todo(title=title)
    session.add(todo)
    session.commit()
    session.refresh(todo)
    return todo


def test_delete_returns_204_with_empty_body(
    client: TestClient, session: Session
) -> None:
    todo = create_todo(session)

    response = client.delete(f"/todos/{todo.id}")

    assert response.status_code == 204
    assert response.content == b""  # No Content = 本文なし


def test_deleted_todo_is_gone(client: TestClient, session: Session) -> None:
    todo = create_todo(session)

    client.delete(f"/todos/{todo.id}")

    assert client.get(f"/todos/{todo.id}").status_code == 404
    # 2回目の削除も 404（もう存在しないものは消せない）
    assert client.delete(f"/todos/{todo.id}").status_code == 404


def test_delete_not_found(client: TestClient) -> None:
    assert client.delete("/todos/9999").status_code == 404


def test_delete_does_not_affect_others(client: TestClient, session: Session) -> None:
    keep = create_todo(session, title="残るほう")
    victim = create_todo(session, title="消えるほう")

    client.delete(f"/todos/{victim.id}")

    body = client.get("/todos").json()
    assert body["total"] == 1
    assert body["items"][0]["title"] == "残るほう"
