"""認証（401）と認可（403）のテスト。

認可は「本人はできる／他人は 403」を必ずペアで検証する。
他人側だけをテストすると「全員 403（機能が壊れている）」でも通ってしまい、
本人側だけをテストすると「全員成功（認可がない）」でも通ってしまう。
"""

from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import Todo, User
from app.security import create_access_token


def create_todo(session: Session, owner: User, title: str = "アリスの秘密") -> Todo:
    todo = Todo(title=title, user_id=owner.id)
    session.add(todo)
    session.commit()
    session.refresh(todo)
    return todo


# --- 認証: 未ログインはすべて 401 ---


@pytest.mark.parametrize(
    ("method", "path", "body"),
    [
        ("GET", "/todos", None),
        ("GET", "/todos/1", None),
        ("POST", "/todos", {"title": "無断作成"}),
        ("PATCH", "/todos/1", {"title": "無断変更"}),
        ("DELETE", "/todos/1", None),
    ],
)
def test_all_todo_endpoints_require_login(
    client: TestClient, method: str, path: str, body: dict | None
) -> None:
    response = client.request(method, path, json=body)

    assert response.status_code == 401


def test_expired_token_is_401(client: TestClient, user: User) -> None:
    expired = create_access_token(user.id, expires_in=timedelta(seconds=-1))
    client.headers["Authorization"] = f"Bearer {expired}"

    assert client.get("/todos").status_code == 401


# --- 認可: 本人はできる／他人は 403（ペアテスト） ---


def test_detail_owner_200_other_403(
    auth_client: TestClient,
    other_client: TestClient,
    session: Session,
    user: User,
) -> None:
    todo = create_todo(session, owner=user)

    assert auth_client.get(f"/todos/{todo.id}").status_code == 200  # 本人
    response = other_client.get(f"/todos/{todo.id}")  # 他人
    assert response.status_code == 403
    assert response.json() == {"detail": "Not the owner of this todo"}


def test_update_owner_200_other_403(
    auth_client: TestClient,
    other_client: TestClient,
    session: Session,
    user: User,
) -> None:
    todo = create_todo(session, owner=user)

    payload = {"title": "書き換え"}
    assert (
        other_client.patch(f"/todos/{todo.id}", json=payload).status_code == 403
    )
    assert auth_client.patch(f"/todos/{todo.id}", json=payload).status_code == 200
    # 他人の 403 が「何も変えていない」ことも確認する
    assert auth_client.get(f"/todos/{todo.id}").json()["title"] == "書き換え"


def test_delete_owner_204_other_403(
    auth_client: TestClient,
    other_client: TestClient,
    session: Session,
    user: User,
) -> None:
    todo = create_todo(session, owner=user)

    assert other_client.delete(f"/todos/{todo.id}").status_code == 403
    # 403 の後もまだ存在する（本人からは見える）
    assert auth_client.get(f"/todos/{todo.id}").status_code == 200
    assert auth_client.delete(f"/todos/{todo.id}").status_code == 204


def test_list_shows_only_own_todos(
    auth_client: TestClient,
    other_client: TestClient,
    session: Session,
    user: User,
    other_user: User,
) -> None:
    create_todo(session, owner=user, title="アリスの分")
    create_todo(session, owner=other_user, title="ボブの分")

    alice_list = auth_client.get("/todos").json()
    bob_list = other_client.get("/todos").json()

    assert [item["title"] for item in alice_list["items"]] == ["アリスの分"]
    assert [item["title"] for item in bob_list["items"]] == ["ボブの分"]


def test_create_assigns_ownership_to_current_user(
    auth_client: TestClient, other_client: TestClient
) -> None:
    created = auth_client.post("/todos", json={"title": "アリスが作成"}).json()

    # 作った本人には見え、他人には 403
    assert auth_client.get(f"/todos/{created['id']}").status_code == 200
    assert other_client.get(f"/todos/{created['id']}").status_code == 403
