from typing import Annotated

from fastapi import Cookie, Depends, HTTPException
from sqlmodel import Session

from app.db import get_session
from app.models import User, UserSession, utcnow

SESSION_COOKIE_NAME = "session_token"

SessionDep = Annotated[Session, Depends(get_session)]


def get_current_user(
    session: SessionDep,
    session_token: Annotated[str | None, Cookie(alias=SESSION_COOKIE_NAME)] = None,
) -> User:
    """cookie のトークンからログイン中ユーザーを引く。失敗はすべて 401。

    401（認証 = あなたが誰か分からない）はここで完結させ、
    403（認可 = 誰かは分かるが権限がない）は各ルータの所有チェックで返す。
    """
    unauthorized = HTTPException(status_code=401, detail="Not authenticated")
    if session_token is None:
        raise unauthorized
    user_session = session.get(UserSession, session_token)
    if user_session is None or user_session.expires_at < utcnow():
        raise unauthorized
    user = session.get(User, user_session.user_id)
    if user is None:
        raise unauthorized
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
