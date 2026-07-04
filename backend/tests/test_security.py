from app.security import generate_session_token, hash_password, verify_password


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
