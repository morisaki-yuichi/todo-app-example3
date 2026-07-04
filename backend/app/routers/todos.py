from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlmodel import Session, col, select

from app.db import get_session
from app.models import Todo, utcnow
from app.schemas import TodoCreate, TodoListResponse, TodoRead, TodoUpdate

router = APIRouter(prefix="/todos", tags=["todos"])

SessionDep = Annotated[Session, Depends(get_session)]


@router.get("", response_model=TodoListResponse)
def list_todos(
    session: SessionDep,
    page: Annotated[int, Query(ge=1)] = 1,
    per_page: Annotated[int, Query(ge=1, le=100)] = 10,
    completed: bool | None = None,
    q: str | None = None,
) -> TodoListResponse:
    statement = select(Todo)
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
def create_todo(data: TodoCreate, session: SessionDep) -> Todo:
    # スキーマ → テーブルモデルへの詰め替え。検証済みの値だけが渡る
    todo = Todo.model_validate(data)
    session.add(todo)
    session.commit()
    session.refresh(todo)  # DB が採番した id 等を読み戻す
    return todo


@router.get("/{todo_id}", response_model=TodoRead)
def get_todo(todo_id: int, session: SessionDep) -> Todo:
    todo = session.get(Todo, todo_id)
    if todo is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    return todo


@router.patch("/{todo_id}", response_model=TodoRead)
def update_todo(todo_id: int, data: TodoUpdate, session: SessionDep) -> Todo:
    todo = session.get(Todo, todo_id)
    if todo is None:
        raise HTTPException(status_code=404, detail="Todo not found")

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
def delete_todo(todo_id: int, session: SessionDep) -> None:
    todo = session.get(Todo, todo_id)
    if todo is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    session.delete(todo)
    session.commit()
