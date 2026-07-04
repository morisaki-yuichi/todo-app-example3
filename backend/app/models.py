from datetime import date, datetime, timezone

from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Todo(SQLModel, table=True):
    __tablename__ = "todos"

    id: int | None = Field(default=None, primary_key=True)
    title: str = Field(max_length=100)
    description: str | None = Field(default=None, max_length=1000)
    due_date: date | None = None
    completed: bool = False
    # タイムゾーンつき（timestamptz）で UTC を保存する。表示時の変換はフロントの仕事
    created_at: datetime = Field(
        default_factory=utcnow, sa_type=DateTime(timezone=True)
    )
    updated_at: datetime = Field(
        default_factory=utcnow, sa_type=DateTime(timezone=True)
    )
