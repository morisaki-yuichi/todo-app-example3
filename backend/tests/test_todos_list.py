from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import Todo, User

BASE_TIME = datetime(2026, 7, 1, 12, 0, 0, tzinfo=timezone.utc)


def create_todos(session: Session, user: User, count: int, **kwargs) -> list[Todo]:
    """created_at を1分ずつずらして count 件作る（並び順を検証可能にするため）。"""
    todos = []
    for i in range(count):
        todo = Todo(
            title=f"タスク{i + 1}",
            user_id=user.id,
            created_at=BASE_TIME + timedelta(minutes=i),
            **kwargs,
        )
        session.add(todo)
        todos.append(todo)
    session.commit()
    for todo in todos:
        session.refresh(todo)
    return todos


def test_list_returns_empty(auth_client: TestClient) -> None:
    response = auth_client.get("/todos")

    assert response.status_code == 200
    body = response.json()
    assert body == {"items": [], "total": 0, "page": 1, "per_page": 10}


def test_list_sorted_by_created_at_desc(
    auth_client: TestClient, session: Session, user: User
) -> None:
    create_todos(session, user, 3)

    body = auth_client.get("/todos").json()

    titles = [item["title"] for item in body["items"]]
    assert titles == ["タスク3", "タスク2", "タスク1"]  # 新しいものが先頭


def test_list_pagination(
    auth_client: TestClient, session: Session, user: User
) -> None:
    create_todos(session, user, 15)

    page1 = auth_client.get("/todos").json()
    assert len(page1["items"]) == 10
    assert page1["total"] == 15

    page2 = auth_client.get("/todos", params={"page": 2}).json()
    assert len(page2["items"]) == 5
    assert page2["page"] == 2
    # ページをまたいで重複しない（降順なのでページ2は古い5件）
    assert page2["items"][-1]["title"] == "タスク1"


def test_list_per_page_boundaries(
    auth_client: TestClient, session: Session, user: User
) -> None:
    create_todos(session, user, 2)

    assert auth_client.get("/todos", params={"per_page": 100}).status_code == 200
    assert auth_client.get("/todos", params={"per_page": 101}).status_code == 422
    assert auth_client.get("/todos", params={"per_page": 0}).status_code == 422
    assert auth_client.get("/todos", params={"page": 0}).status_code == 422


def test_list_filter_by_completed(
    auth_client: TestClient, session: Session, user: User
) -> None:
    create_todos(session, user, 2, completed=True)
    create_todos(session, user, 3, completed=False)

    done = auth_client.get("/todos", params={"completed": "true"}).json()
    assert done["total"] == 2
    assert all(item["completed"] for item in done["items"])

    pending = auth_client.get("/todos", params={"completed": "false"}).json()
    assert pending["total"] == 3


def test_list_filter_by_keyword(
    auth_client: TestClient, session: Session, user: User
) -> None:
    session.add(Todo(title="牛乳を買う", user_id=user.id))
    session.add(
        Todo(title="報告書の提出", description="牛乳の在庫も書く", user_id=user.id)
    )
    session.add(Todo(title="ジョギング", user_id=user.id))
    session.commit()

    body = auth_client.get("/todos", params={"q": "牛乳"}).json()

    # title 一致と description 一致の両方が拾われる
    assert body["total"] == 2
    titles = {item["title"] for item in body["items"]}
    assert titles == {"牛乳を買う", "報告書の提出"}


def test_list_combined_filters(
    auth_client: TestClient, session: Session, user: User
) -> None:
    session.add(Todo(title="牛乳を買う", completed=True, user_id=user.id))
    session.add(Todo(title="牛乳を注文", completed=False, user_id=user.id))
    session.commit()

    body = auth_client.get(
        "/todos", params={"q": "牛乳", "completed": "true"}
    ).json()

    assert body["total"] == 1
    assert body["items"][0]["title"] == "牛乳を買う"
