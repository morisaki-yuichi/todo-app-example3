from datetime import date, datetime

from sqlmodel import SQLModel


class TodoRead(SQLModel):
    """レスポンス用スキーマ。DB モデルと分けるのは、
    「外に見せる形」と「保存する形」を独立に変えられるようにするため
    （S4 で user_id を足しても、見せたくなければここに足さなければよい）。
    """

    id: int
    title: str
    description: str | None
    due_date: date | None
    completed: bool
    created_at: datetime
    updated_at: datetime


class TodoListResponse(SQLModel):
    items: list[TodoRead]
    total: int
    page: int
    per_page: int
