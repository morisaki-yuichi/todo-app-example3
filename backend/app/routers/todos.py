from typing import Annotated

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import func, or_
from sqlmodel import col, select

from app.deps import CurrentUser, SessionDep
from app.models import Todo, utcnow
from app.schemas import TodoCreate, TodoListResponse, TodoRead, TodoUpdate

router = APIRouter(prefix="/todos", tags=["todos"])


def get_owned_todo(todo_id: int, session, current_user) -> Todo:
    """ID で引き、404（存在しない）と 403（他人のもの）を切り分ける共通処理。

    404 と 403 の順序に注意: 存在チェックが先。逆にすると「存在しない ID」にも
    403 を返すことになり、心配なら 404 に寄せる設計もあるが、本教材は
    「認証(401)・認可(403)・存在(404) を区別して学ぶ」ため明確に分ける。
    """
    todo = session.get(Todo, todo_id)
    if todo is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    if todo.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not the owner of this todo")
    return todo


@router.get("", response_model=TodoListResponse)
def list_todos(
    session: SessionDep,
    current_user: CurrentUser,
    page: Annotated[int, Query(ge=1)] = 1,
    per_page: Annotated[int, Query(ge=1, le=100)] = 10,
    completed: bool | None = None,
    q: str | None = None,
) -> TodoListResponse:
    # 認可の第一線: そもそも自分の TODO しか対象にしない
    statement = select(Todo).where(Todo.user_id == current_user.id)
    if completed is not None:
        statement = statement.where(Todo.completed == completed)
    if q:
        # title / description の部分一致（ilike = 大文字小文字を区別しない LIKE）
        pattern = f"%{q}%"
        statement = statement.where(
            or_(col(Todo.title).ilike(pattern), col(Todo.description).ilike(pattern))
        )

    # 件数は「絞り込みまで適用した集合」に対して数える（ページ適用前）
    total = session.exec(
        select(func.count()).select_from(statement.subquery())
    ).one()

    todos = session.exec(
        statement
        # created_at が同時刻でも順序が揺れないよう id をタイブレーカーにする
        .order_by(col(Todo.created_at).desc(), col(Todo.id).desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    ).all()

    return TodoListResponse(
        items=[TodoRead.model_validate(todo) for todo in todos],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.post("", response_model=TodoRead, status_code=201)
def create_todo(data: TodoCreate, session: SessionDep, current_user: CurrentUser) -> Todo:
    # スキーマ → テーブルモデルへの詰め替え。検証済みの値だけが渡る。
    # user_id はクライアントから受けず、ログイン中ユーザーで確定させる
    todo = Todo.model_validate(data, update={"user_id": current_user.id})
    session.add(todo)
    session.commit()
    session.refresh(todo)  # DB が採番した id 等を読み戻す
    return todo


@router.get("/{todo_id}", response_model=TodoRead)
def get_todo(todo_id: int, session: SessionDep, current_user: CurrentUser) -> Todo:
    return get_owned_todo(todo_id, session, current_user)


@router.patch("/{todo_id}", response_model=TodoRead)
def update_todo(
    todo_id: int, data: TodoUpdate, session: SessionDep, current_user: CurrentUser
) -> Todo:
    todo = get_owned_todo(todo_id, session, current_user)

    # exclude_unset: 「リクエストに含まれていた項目」だけを取り出す。
    # これにより「送らない = 変更しない」「null を送る = 消す」を区別できる
    updates = data.model_dump(exclude_unset=True)
    todo.sqlmodel_update(updates)
    todo.updated_at = utcnow()
    session.add(todo)
    session.commit()
    session.refresh(todo)
    return todo


@router.delete("/{todo_id}", status_code=204)
def delete_todo(todo_id: int, session: SessionDep, current_user: CurrentUser) -> None:
    todo = get_owned_todo(todo_id, session, current_user)
    session.delete(todo)
    session.commit()
