from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Backend API"
    env: str = "development"
    debug: bool = True
    frontend_url: str = "http://localhost:8080"

    host: str = "0.0.0.0"
    port: int = 8000

    # Redis / Celery, not localhost, since every service runs in its own container
    redis_url: str = "redis://redis:6379/0"
    celery_broker_url: str = "redis://redis:6379/0"
    celery_result_backend: str = "redis://redis:6379/1"

    # Reserved for future supabase integration
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_timeout_seconds: float = 10.0

    # OpenRouteService API key
    ors_api_key: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
