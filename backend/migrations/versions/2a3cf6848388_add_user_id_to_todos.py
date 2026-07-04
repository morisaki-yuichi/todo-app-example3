"""add user_id to todos

Revision ID: 2a3cf6848388
Revises: b216a80d73fd
Create Date: 2026-07-05 01:27:47.650945

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel  # autogenerate が sqlmodel.sql.sqltypes.AutoString 等を出力するため


# revision identifiers, used by Alembic.
revision: str = '2a3cf6848388'
down_revision: Union[str, Sequence[str], None] = 'b216a80d73fd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# 既存の TODO の引き取り先ユーザー。"!" は bcrypt ハッシュとして不正な値なので
# verify_password が必ず False になる = このユーザーとしてログインする手段はない
LEGACY_USER_EMAIL = "legacy@example.com"


def upgrade() -> None:
    """既存データがあるテーブルへの NOT NULL 列追加は3段階で行う。

    autogenerate の生成物（nullable=False で一発追加）は、既存行の user_id を
    埋める手段がないため NotNullViolation で失敗する（実験④で観察済み）。
    「① nullable で追加 → ② 既存行を埋め戻す → ③ NOT NULL 化」に手で書き換えた。
    """
    # ① まず NULL 許可で列を追加する（既存行は user_id = NULL になる）
    op.add_column("todos", sa.Column("user_id", sa.Integer(), nullable=True))

    # ② データ移行: 既存行があれば、引き取り先ユーザーを作って割り当てる
    conn = op.get_bind()
    orphan_count = conn.execute(
        sa.text("SELECT count(*) FROM todos WHERE user_id IS NULL")
    ).scalar()
    if orphan_count:
        conn.execute(
            sa.text(
                "INSERT INTO users (email, password_hash, created_at) "
                "VALUES (:email, '!', now()) "
                "ON CONFLICT (email) DO NOTHING"
            ),
            {"email": LEGACY_USER_EMAIL},
        )
        legacy_id = conn.execute(
            sa.text("SELECT id FROM users WHERE email = :email"),
            {"email": LEGACY_USER_EMAIL},
        ).scalar()
        conn.execute(
            sa.text("UPDATE todos SET user_id = :uid WHERE user_id IS NULL"),
            {"uid": legacy_id},
        )

    # ③ 全行が埋まったので NOT NULL 化し、外部キーとインデックスを張る。
    #    外部キー名は明示する（autogenerate は None（無名）で出力するため、
    #    そのままでは downgrade の drop_constraint(None) が実行できない）
    op.alter_column("todos", "user_id", nullable=False)
    op.create_index(op.f("ix_todos_user_id"), "todos", ["user_id"], unique=False)
    op.create_foreign_key("fk_todos_user_id_users", "todos", "users", ["user_id"], ["id"])


def downgrade() -> None:
    op.drop_constraint("fk_todos_user_id_users", "todos", type_="foreignkey")
    op.drop_index(op.f("ix_todos_user_id"), table_name="todos")
    op.drop_column("todos", "user_id")
    # 引き取り先ユーザーは残す（消すと、他の経緯で作られた同名ユーザーを
    # 巻き添えにする恐れがある。不要なら手で消す判断をする）
