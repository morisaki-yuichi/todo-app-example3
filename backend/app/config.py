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

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.db_host}:{self.db_port}/{self.postgres_db}"
        )


settings = Settings()
