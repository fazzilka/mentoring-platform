from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Mentoring Platform API"
    environment: str = "local"
    debug: bool = False
    database_url: str = "postgresql+asyncpg://mentoring:mentoring@localhost:5432/mentoring"
    celery_broker_url: str = "amqp://mentoring:mentoring@localhost:5672//"
    jwt_secret: str | None = None
    access_token_minutes: int = 15
    refresh_token_days: int = 30
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_from: str = "mentoring@localhost"
    telegram_bot_token: str | None = None
    telegram_bot_username: str | None = None
    telegram_webhook_secret: str | None = None
    frontend_origin: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
