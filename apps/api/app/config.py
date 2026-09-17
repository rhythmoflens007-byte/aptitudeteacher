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
    # Comma-separated, tried in order when the main model is overloaded or out of quota. The free tier
    # allows only ~20 requests a day per model, so a chain of models keeps the tutor working all day.
    # Empty disables the fallback.
    gemini_fallback_models: str = "gemini-3.8-flash,gemini-flash-latest,gemini-3.5-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite"

    def gemini_models(self) -> list[str]:
        fallbacks = [name.strip() for name in self.gemini_fallback_models.split(",") if name.strip()]
        return list(dict.fromkeys([self.gemini_model, *fallbacks]))


@lru_cache
def get_settings() -> Settings:
    return Settings()
