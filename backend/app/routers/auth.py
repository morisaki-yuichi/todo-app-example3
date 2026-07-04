from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Cookie, HTTPException, Response
from sqlmodel import select

from app.deps import SESSION_COOKIE_NAME, CurrentUser, SessionDep
from app.models import User, UserSession, utcnow
from app.schemas import LoginRequest, UserCreate, UserRead
from app.security import generate_session_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

SESSION_LIFETIME = timedelta(days=7)


def _start_session(session: SessionDep, user: User, response: Response) -> None:
    """セッション行を作り、トークンを httpOnly cookie で返す。"""
    user_session = UserSession(
        token=generate_session_token(),
        user_id=user.id,
        expires_at=utcnow() + SESSION_LIFETIME,
    )
    session.add(user_session)
    session.commit()
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=user_session.token,
        max_age=int(SESSION_LIFETIME.total_seconds()),
        httponly=True,   # JavaScript から読めない（XSS でトークンを盗まれない）
        samesite="lax",  # 他サイト起点の送信を制限（CSRF の軽減）
        # secure=True は HTTPS 前提。本番では必須（開発は http なので付けない）
    )


@router.post("/register", response_model=UserRead, status_code=201)
def register(data: UserCreate, session: SessionDep, response: Response) -> User:
    existing = session.exec(select(User).where(User.email == data.email)).first()
    if existing is not None:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(email=data.email, password_hash=hash_password(data.password))
    session.add(user)
    session.commit()
    session.refresh(user)

    _start_session(session, user, response)  # 登録後は自動ログイン
    return user


@router.post("/login", response_model=UserRead)
def login(data: LoginRequest, session: SessionDep, response: Response) -> User:
    user = session.exec(select(User).where(User.email == data.email)).first()
    # 「メール未登録」と「パスワード違い」を区別しない同一メッセージにする
    # （区別すると、攻撃者が登録済みメールアドレスを列挙できてしまう）
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    _start_session(session, user, response)
    return user


@router.post("/logout", status_code=204)
def logout(
    session: SessionDep,
    response: Response,
    session_token: Annotated[str | None, Cookie(alias=SESSION_COOKIE_NAME)] = None,
) -> None:
    """サーバ側のセッション行を消し、cookie も破棄する。

    行削除により、このトークンはその瞬間から全世界で無効になる
    （＝ステートフル方式の強み。JWT ではこうはいかない。S8 で対比）。
    未ログインで呼ばれても 204（何度呼んでも結果は同じ = 冪等）。
    """
    if session_token is not None:
        user_session = session.get(UserSession, session_token)
        if user_session is not None:
            session.delete(user_session)
            session.commit()
    response.delete_cookie(SESSION_COOKIE_NAME)


@router.get("/me", response_model=UserRead)
def me(current_user: CurrentUser) -> User:
    return current_user
