import secrets

import bcrypt


def hash_password(password: str) -> str:
    """bcrypt でハッシュ化する。同じ入力でも毎回違う値になる（ソルト内蔵）。"""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def generate_session_token() -> str:
    """セッション用の推測不能なランダムトークン（URL安全な43文字）。"""
    return secrets.token_urlsafe(32)
