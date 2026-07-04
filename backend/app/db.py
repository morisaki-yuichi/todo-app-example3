from collections.abc import Generator

from sqlmodel import Session, create_engine

from app.config import settings

engine = create_engine(settings.database_url)


def get_session() -> Generator[Session, None, None]:
    """リクエストごとに DB セッションを開き、終了時に必ず閉じる依存。

    FastAPI の Depends から使う。yield より後（close）は
    レスポンス送出後に実行される。
    """
    with Session(engine) as session:
        yield session
