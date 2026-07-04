FROM python:3.12-slim

# uv 公式イメージからバイナリだけをコピーして導入する
COPY --from=ghcr.io/astral-sh/uv:0.11.7 /uv /uvx /bin/

WORKDIR /app

# 依存定義だけを先にコピーして同期する。
# アプリのコードより変更頻度が低いので、レイヤーキャッシュが効いてビルドが速くなる
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev

COPY . .

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
