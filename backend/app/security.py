import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.config import settings

JWT_ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    """bcrypt でハッシュ化する。同じ入力でも毎回違う値になる（ソルト内蔵）。"""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def generate_session_token() -> str:
    """セッション用の推測不能なランダムトークン（URL安全な43文字）。"""
    return secrets.token_urlsafe(32)


def create_access_token(
    user_id: int, expires_in: timedelta | None = None
) -> str:
    """JWT を発行する。ペイロードは「誰か（sub）」と「いつまで（exp）」だけ。

    JWT は署名つきの読める札。中身は base64 で誰でも読める（暗号化ではない）が、
    署名により改ざんは検出できる。サーバは DB を見ずに検証だけで本人確認できる
    （= ステートレス。その代償として即時失効ができない）。
    """
    if expires_in is None:
        expires_in = timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": str(user_id),  # JWT の仕様上 sub は文字列
        "exp": datetime.now(timezone.utc) + expires_in,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> int:
    """JWT を検証して user_id を返す。

    署名不正・期限切れ・形式不正はすべて jwt.InvalidTokenError（の派生）で
    投げられる。呼び出し側はこれを 401 に変換する。
    """
    payload = jwt.decode(token, settings.secret_key, algorithms=[JWT_ALGORITHM])
    return int(payload["sub"])
