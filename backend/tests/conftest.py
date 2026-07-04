from collections.abc import Generator
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlmodel import Session, SQLModel, create_engine

import app.models  # noqa: F401  # テーブル定義を SQLModel.metadata に登録させる
from app.config import settings
from app.db import get_session
from app.deps import SESSION_COOKIE_NAME
from app.main import app
from app.models import User, UserSession, utcnow
from app.security import generate_session_token

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
    """アプリの get_session をテスト用セッションに差し替えたクライアント（未ログイン）。"""

    def override_get_session() -> Generator[Session, None, None]:
        yield session

    app.dependency_overrides[get_session] = override_get_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def _make_user(session: Session, email: str) -> User:
    # password_hash="!" は bcrypt として不正な値 = ログイン API からは入れないユーザー。
    # ログイン API 自体の検証は test_auth.py が実パスワードで行う
    user = User(email=email, password_hash="!")
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def login_as(client: TestClient, session: Session, user: User) -> None:
    """セッション行を直接作って cookie をセットする（テスト用の高速ログイン）。"""
    token = generate_session_token()
    session.add(
        UserSession(
            token=token, user_id=user.id, expires_at=utcnow() + timedelta(days=1)
        )
    )
    session.commit()
    client.cookies.set(SESSION_COOKIE_NAME, token)


@pytest.fixture
def user(session: Session) -> User:
    return _make_user(session, "alice@example.com")


@pytest.fixture
def other_user(session: Session) -> User:
    return _make_user(session, "bob@example.com")


@pytest.fixture
def auth_client(
    client: TestClient, session: Session, user: User
) -> TestClient:
    """user（alice）としてログイン済みのクライアント。"""
    login_as(client, session, user)
    return client


@pytest.fixture
def other_client(
    session: Session, other_user: User
) -> Generator[TestClient, None, None]:
    """other_user（bob）としてログイン済みの、もう1つのクライアント。"""

    def override_get_session() -> Generator[Session, None, None]:
        yield session

    app.dependency_overrides[get_session] = override_get_session
    with TestClient(app) as test_client:
        login_as(test_client, session, other_user)
        yield test_client
    app.dependency_overrides.clear()
