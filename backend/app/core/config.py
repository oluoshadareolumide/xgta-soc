from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "mssql+pyodbc://sa:Password@localhost/xgta_soc?driver=ODBC+Driver+17+for+SQL+Server"

    # JWT
    SECRET_KEY: str = "change-me-in-production-at-least-32-characters"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # App
    APP_ENV: str = "development"
    APP_TITLE: str = "XGTA-SOC API"
    API_V1_PREFIX: str = "/api/v1"

    # CORS
    ALLOWED_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Anthropic
    ANTHROPIC_API_KEY: str = ""

    # Alert Simulator
    SIMULATE_ALERTS: bool = True
    SIM_INTERVAL_MIN: int = 20   # seconds between simulated alerts (min)
    SIM_INTERVAL_MAX: int = 60   # seconds between simulated alerts (max)

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
