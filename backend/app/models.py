from datetime import date, datetime, timezone

from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(max_length=255, unique=True, index=True)
    # 平文パスワードは保存しない。bcrypt ハッシュのみ（app/security.py 参照）
    password_hash: str
    created_at: datetime = Field(
        default_factory=utcnow, sa_type=DateTime(timezone=True)
    )


# UserSession（sessions テーブル）は S8 の JWT 移行で廃止した。
# JWT はサーバ側に状態を持たない（ステートレス）ため、セッションの実体が不要になる。
# 経緯は docs/08_sprint8/ を参照。


class Todo(SQLModel, table=True):
    __tablename__ = "todos"

    id: int | None = Field(default=None, primary_key=True)
    title: str = Field(max_length=100)
    description: str | None = Field(default=None, max_length=1000)
    due_date: date | None = None
    completed: bool = False
    # 所有者。S2〜S3 の間は存在せず、既存データのマイグレーションつきで追加した
    user_id: int = Field(foreign_key="users.id", index=True)
    # タイムゾーンつき（timestamptz）で UTC を保存する。表示時の変換はフロントの仕事
    created_at: datetime = Field(
        default_factory=utcnow, sa_type=DateTime(timezone=True)
    )
    updated_at: datetime = Field(
        default_factory=utcnow, sa_type=DateTime(timezone=True)
    )
