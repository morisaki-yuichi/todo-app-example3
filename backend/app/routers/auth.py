from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.deps import CurrentUser, SessionDep
from app.models import User
from app.schemas import LoginRequest, TokenResponse, UserCreate, UserRead
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def _token_response(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user.id),
        user=UserRead.model_validate(user),
    )


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(data: UserCreate, session: SessionDep) -> TokenResponse:
    existing = session.exec(select(User).where(User.email == data.email)).first()
    if existing is not None:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(email=data.email, password_hash=hash_password(data.password))
    session.add(user)
    session.commit()
    session.refresh(user)

    # 登録後すぐ使えるよう、その場でトークンを発行する（自動ログイン相当）
    return _token_response(user)


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, session: SessionDep) -> TokenResponse:
    user = session.exec(select(User).where(User.email == data.email)).first()
    # 「メール未登録」と「パスワード違い」を区別しない同一メッセージにする
    # （区別すると、攻撃者が登録済みメールアドレスを列挙できてしまう）
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    return _token_response(user)


# logout エンドポイントは JWT 移行で廃止した。
# JWT はサーバ側に「消すべき状態」がないため、ログアウトは
# クライアントがトークンを破棄するだけになる（= 即時失効できないのが
# JWT の本質的な限界。cookie セッション時代は行削除で即失効できた）。


@router.get("/me", response_model=UserRead)
def me(current_user: CurrentUser) -> User:
    return current_user
