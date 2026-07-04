from datetime import date, datetime

from pydantic import field_validator
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


class TodoUpdate(SQLModel):
    """部分更新（PATCH）用スキーマ。全項目が省略可能。

    「項目を送らない = 変更しない」と「null を送る = 消す」を区別する。
    区別の実装はルータ側の model_dump(exclude_unset=True)。
    ただし title は NOT NULL なので、null の指定は入り口（422）で止める。
    """

    title: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=1000)
    due_date: date | None = None
    completed: bool | None = None

    @field_validator("title")
    @classmethod
    def title_cannot_be_null(cls, value: str | None) -> str:
        # このバリデータは title が「送られたとき」だけ動く（省略時は動かない）。
        # つまりここで None なのは「明示的に null を送った」場合のみ
        if value is None:
            raise ValueError("title cannot be null")
        return value


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
