from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlmodel import Session, SQLModel, create_engine

import app.models  # noqa: F401  # テーブル定義を SQLModel.metadata に登録させる
from app.config import settings
from app.db import get_session
from app.main import app

# 開発用 DB（todo）を壊さないよう、テストは専用 DB（todo_test）に対して行う
TEST_DB_NAME = f"{settings.postgres_db}_test"
TEST_DATABASE_URL = settings.database_url.rsplit("/", 1)[0] + f"/{TEST_DB_NAME}"


def _ensure_test_database() -> None:
    """テスト専用 DB がなければ作る（初回実行や CI 環境向けの自動セットアップ）。"""
    # CREATE DATABASE はトランザクション内で実行できないため AUTOCOMMIT で接続する
    admin_engine = create_engine(settings.database_url, isolation_level="AUTOCOMMIT")
    with admin_engine.connect() as conn:
        exists = conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :name"),
            {"name": TEST_DB_NAME},
        ).scalar()
        if not exists:
            conn.execute(text(f'CREATE DATABASE "{TEST_DB_NAME}"'))
    admin_engine.dispose()


@pytest.fixture(scope="session")
def test_engine():
    _ensure_test_database()
    engine = create_engine(TEST_DATABASE_URL)
    yield engine
    engine.dispose()


@pytest.fixture
def session(test_engine) -> Generator[Session, None, None]:
    """テストごとに全テーブルを作り、終わったら落とす（テスト間の独立性を保証）。"""
    SQLModel.metadata.create_all(test_engine)
    try:
        with Session(test_engine) as session:
            yield session
    finally:
        SQLModel.metadata.drop_all(test_engine)


@pytest.fixture
def client(session: Session) -> Generator[TestClient, None, None]:
    """アプリの get_session をテスト用セッションに差し替えたクライアント。"""

    def override_get_session() -> Generator[Session, None, None]:
        yield session

    app.dependency_overrides[get_session] = override_get_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
