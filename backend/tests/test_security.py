from datetime import timedelta

import jwt
import pytest

from app.security import (
    create_access_token,
    decode_access_token,
    generate_session_token,
    hash_password,
    verify_password,
)


def test_password_hash_roundtrip() -> None:
    password_hash = hash_password("correct horse battery staple")

    assert password_hash != "correct horse battery staple"  # 平文が残らない
    assert verify_password("correct horse battery staple", password_hash)
    assert not verify_password("wrong password", password_hash)


def test_same_password_produces_different_hashes() -> None:
    # ソルトが毎回変わるため、同じ入力でもハッシュは一致しない。
    # （一致するなら「同じパスワードの人」が漏えいハッシュから推測できてしまう）
    assert hash_password("secret123") != hash_password("secret123")


def test_session_token_is_unique_and_long() -> None:
    tokens = {generate_session_token() for _ in range(100)}

    assert len(tokens) == 100
    assert all(len(token) >= 43 for token in tokens)


def test_jwt_roundtrip() -> None:
    token = create_access_token(user_id=42)

    assert decode_access_token(token) == 42


def test_jwt_expired_is_rejected() -> None:
    # 期限切れのトークンは ExpiredSignatureError（InvalidTokenError の派生）
    token = create_access_token(user_id=42, expires_in=timedelta(seconds=-1))

    with pytest.raises(jwt.ExpiredSignatureError):
        decode_access_token(token)


def test_jwt_tampered_is_rejected() -> None:
    # 署名部分を書き換えると検証で落ちる（改ざん検出）
    token = create_access_token(user_id=42)
    tampered = token[:-4] + ("AAAA" if not token.endswith("AAAA") else "BBBB")

    with pytest.raises(jwt.InvalidTokenError):
        decode_access_token(tampered)


def test_jwt_payload_is_readable_without_key() -> None:
    """JWT は「暗号化」ではない: 鍵がなくても中身は読める（署名の検証だけが守り）。

    だからペイロードに秘密情報（パスワード等）を入れてはならない。
    """
    token = create_access_token(user_id=42)

    payload = jwt.decode(token, options={"verify_signature": False})

    assert payload["sub"] == "42"
