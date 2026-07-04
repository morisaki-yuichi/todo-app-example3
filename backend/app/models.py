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


class UserSession(SQLModel, table=True):
    """cookie セッションの実体（サーバ側に保存する「ステートフル」方式）。

    cookie にはこの token だけが入る。ログアウト = この行の削除なので、
    サーバ側から即時に無効化できる（JWT との対比ポイント。S8 で扱う）。
    ※ クラス名を Session にすると sqlmodel.Session と衝突するため UserSession
    """

    __tablename__ = "sessions"

    token: str = Field(primary_key=True, max_length=64)
    user_id: int = Field(foreign_key="users.id", index=True)
    expires_at: datetime = Field(sa_type=DateTime(timezone=True))
    created_at: datetime = Field(
        default_factory=utcnow, sa_type=DateTime(timezone=True)
    )


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
