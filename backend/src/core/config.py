from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Mentoring Platform API"
    environment: str = "local"
    debug: bool = False
    database_url: str = "postgresql+asyncpg://mentoring:mentoring@localhost:5432/mentoring"
    jwt_secret: str | None = None
    access_token_minutes: int = Field(default=15, ge=1, le=60)
    refresh_token_days: int = Field(default=30, ge=1, le=90)
    refresh_cookie_secure: bool = False
    frontend_origin: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
