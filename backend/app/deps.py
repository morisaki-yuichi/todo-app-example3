from typing import Annotated

import jwt
from fastapi import Depends, Header, HTTPException
from sqlmodel import Session

from app.db import get_session
from app.models import User
from app.security import decode_access_token

SessionDep = Annotated[Session, Depends(get_session)]


def get_current_user(
    session: SessionDep,
    authorization: Annotated[str | None, Header()] = None,
) -> User:
    """Authorization: Bearer <JWT> からログイン中ユーザーを引く。失敗はすべて 401。

    cookie セッション時代と違い、トークンの検証に DB は不要（署名と期限だけ）。
    DB を引くのは「そのユーザーがまだ存在するか」の確認のみ。
    401（認証）はここで完結させ、403（認可）は各ルータの所有チェックが返す。
    """
    unauthorized = HTTPException(
        status_code=401,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if authorization is None or not authorization.startswith("Bearer "):
        raise unauthorized
    token = authorization.removeprefix("Bearer ")
    try:
        user_id = decode_access_token(token)
    except jwt.InvalidTokenError:
        # 署名不正・期限切れ・形式不正はまとめて 401（理由は攻撃者に教えない）
        raise unauthorized
    user = session.get(User, user_id)
    if user is None:
        raise unauthorized
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
