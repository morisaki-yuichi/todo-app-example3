from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """アプリ設定。優先順位: 環境変数 > ルートの .env > このクラスの既定値。

    既定値はホスト上での開発（localhost:5433）に合わせてある。
    コンテナ内では compose.yaml が DB_HOST=db / DB_PORT=5432 を注入して上書きする。
    """

    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")

    postgres_user: str = "todo"
    postgres_password: str = "todo_dev_password"
    postgres_db: str = "todo"
    db_host: str = "localhost"
    db_port: int = 5433

    # JWT の署名鍵。漏れると誰でもトークンを偽造できる。本番では必ず .env で
    # ランダム値に差し替える（既定値は開発専用）。
    # HS256 の鍵は32バイト以上が必須（短いと pyjwt が InsecureKeyLengthWarning を出す）
    secret_key: str = "dev-secret-key-change-me-0123456789abcdef"
    access_token_expire_minutes: int = 60

    # CORS で許可するフロントのオリジン（S8 で導入）
    frontend_origin: str = "http://localhost:5176"

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.db_host}:{self.db_port}/{self.postgres_db}"
        )


settings = Settings()
