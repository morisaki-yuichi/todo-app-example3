from datetime import date

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import Todo


def create_todo(session: Session, **kwargs) -> Todo:
    todo = Todo(title=kwargs.pop("title", "元のタイトル"), **kwargs)
    session.add(todo)
    session.commit()
    session.refresh(todo)
    return todo


def test_patch_updates_only_sent_fields(client: TestClient, session: Session) -> None:
    todo = create_todo(session, description="元の説明", due_date=date(2026, 7, 10))

    response = client.patch(f"/todos/{todo.id}", json={"title": "新タイトル"})

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "新タイトル"
    assert body["description"] == "元の説明"  # 送っていない項目は変わらない
    assert body["due_date"] == "2026-07-10"


def test_patch_toggles_completed(client: TestClient, session: Session) -> None:
    todo = create_todo(session)

    assert (
        client.patch(f"/todos/{todo.id}", json={"completed": True}).json()["completed"]
        is True
    )
    assert (
        client.patch(f"/todos/{todo.id}", json={"completed": False}).json()["completed"]
        is False
    )


def test_patch_null_clears_description(client: TestClient, session: Session) -> None:
    todo = create_todo(session, description="消される説明")

    response = client.patch(f"/todos/{todo.id}", json={"description": None})

    assert response.status_code == 200
    assert response.json()["description"] is None


def test_patch_null_title_is_422(client: TestClient, session: Session) -> None:
    # 「送らない」は OK だが「null を送る」は拒否（title は必須項目のため）
    todo = create_todo(session)

    response = client.patch(f"/todos/{todo.id}", json={"title": None})

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", "title"]


def test_patch_validates_like_create(client: TestClient, session: Session) -> None:
    todo = create_todo(session)

    assert (
        client.patch(f"/todos/{todo.id}", json={"title": "あ" * 101}).status_code == 422
    )
    assert (
        client.patch(
            f"/todos/{todo.id}", json={"description": "い" * 1001}
        ).status_code
        == 422
    )


def test_patch_bumps_updated_at(client: TestClient, session: Session) -> None:
    todo = create_todo(session)
    before = client.get(f"/todos/{todo.id}").json()

    after = client.patch(f"/todos/{todo.id}", json={"completed": True}).json()

    assert after["updated_at"] > before["updated_at"]
    assert after["created_at"] == before["created_at"]


def test_patch_not_found(client: TestClient) -> None:
    response = client.patch("/todos/9999", json={"title": "だれ？"})

    assert response.status_code == 404
