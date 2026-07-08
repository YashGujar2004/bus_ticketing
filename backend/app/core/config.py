#application configuration loaded from environment variables
#uses pydantic-settings for type-safe config with .env file support

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # ── Database ──────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/bus_ticketing"

    # ── JWT Authentication ────────────────────────────────────────────────
    SECRET_KEY: str = "secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ── Google Gemini AI ──────────────────────────────────────────────────
    GEMINI_API_KEY: str = "api-key"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


@lru_cache()
def get_settings() -> Settings:
    """Singleton settings instance, cached for performance."""
    return Settings()
