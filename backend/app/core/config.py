import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "MediVault API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    # Security & JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "medivault-super-secret-key-2026-academic-prototype-jwt")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12  # 12 hours

    # Oracle Database Settings
    ORACLE_USER: str = os.getenv("ORACLE_USER", "medivault")
    ORACLE_PASSWORD: str = os.getenv("ORACLE_PASSWORD", "MediVault2026#")
    ORACLE_DSN: str = os.getenv("ORACLE_DSN", "localhost:1521/XE")
    ORACLE_DRIVER: str = os.getenv("ORACLE_DRIVER", "Oracle in XE")

    # Emergency Profile Security
    EMERGENCY_TOKEN_EXPIRE_DAYS: int = 30

    # CORS
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]

    model_config = SettingsConfigDict(case_sensitive=True)

settings = Settings()
