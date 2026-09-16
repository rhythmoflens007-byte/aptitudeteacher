from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    cors_origins: list[str] = ["http://localhost:3000"]

    database_url: str = ""
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    upstash_redis_url: str = ""
    upstash_redis_token: str = ""

    gemini_api_key: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
