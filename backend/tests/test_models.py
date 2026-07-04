from datetime import date

from sqlmodel import Session, select

from app.models import Todo, User


def test_todo_roundtrip(session: Session, user: User) -> None:
    """Todo を保存して読み戻せる（DB 接続とモデル定義の疎通確認）。"""
    todo = Todo(
        title="牛乳を買う",
        description="低脂肪",
        due_date=date(2026, 7, 10),
        user_id=user.id,
    )
    session.add(todo)
    session.commit()
    session.refresh(todo)

    assert todo.id is not None
    assert todo.completed is False  # 既定値
    assert todo.created_at is not None

    found = session.exec(select(Todo).where(Todo.id == todo.id)).one()
    assert found.title == "牛乳を買う"
    assert found.due_date == date(2026, 7, 10)
