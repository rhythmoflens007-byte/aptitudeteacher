from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

API_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=API_DIR / ".env", extra="ignore")

    environment: str = "development"
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    database_url: str = f"sqlite:///{(API_DIR / 'aptitude.db').as_posix()}"

    jwt_secret: str = "dev-only-change-me"
    jwt_expiry_hours: int = 24 * 7

    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.6-flash"
    # Used automatically when the main model is overloaded. Empty disables the fallback.
    gemini_fallback_model: str = "gemini-3.5-flash"


@lru_cache
def get_settings() -> Settings:
    return Settings()
