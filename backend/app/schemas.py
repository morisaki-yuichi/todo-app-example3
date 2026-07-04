from datetime import date, datetime

from sqlmodel import Field, SQLModel


class TodoCreate(SQLModel):
    """作成リクエスト用スキーマ。

    Todo（table=True）で直接受けない理由:
    - クライアントに id / created_at 等を指定させない（受け口に無い項目は入らない）
    - table=True のモデルは Pydantic バリデーションを実行しないため、
      制約（max_length 等）はこちらの非テーブルスキーマで効かせる
    """

    title: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=1000)
    due_date: date | None = None  # 過去日も許可（仕様）
    completed: bool = False


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
