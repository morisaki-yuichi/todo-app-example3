from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, todos

app = FastAPI(title="TODO API")

# CORS: 別オリジンのフロント（ブラウザ上の JS）からのアクセスを許可する。
# 許可がなくてもサーバは応答を返すが、ブラウザが JS に渡さない——
# つまり CORS は「ブラウザが守る」仕組みで、この設定は「ブラウザへの許可証」。
# オリジンは .env 駆動（FRONTEND_ORIGIN）。"*" にしない
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_methods=["*"],  # GET/POST/PATCH/DELETE と プリフライト OPTIONS
    allow_headers=["*"],  # Authorization / Content-Type を含む
)

app.include_router(auth.router)
app.include_router(todos.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
