# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # App
    APP_NAME: str = "Fixxly CLOS API"
    DEBUG: bool = True
    SECRET_KEY: str = "fixxly-secret-key-change-in-production-2024"
    
    # Database
    DATABASE_URL: str = "sqlite:///./fixxly.db"
    
    # Redis (optional)
    REDIS_URL: str = "redis://localhost:6379"
    
    # AI - Groq (FREE - https://console.groq.com)
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    
    # AI - Gemini fallback (FREE tier - https://ai.google.dev)
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    
    # Business Rules
    DEFAULT_SERVICE_LEVEL: float = 0.95   # 95% service level
    DEFAULT_MIN_MARGIN_PCT: float = 15.0  # 15% minimum margin
    PRICE_CHANGE_APPROVAL_THRESHOLD: float = 5.0   # 5% triggers approval
    PRICE_CHANGE_VP_THRESHOLD: float = 15.0         # 15% needs VP
    PO_APPROVAL_THRESHOLD: float = 50000.0           # INR 50K
    PO_VP_THRESHOLD: float = 500000.0                # INR 5L
    OVERSTOCK_COVER_DAYS: int = 60
    CRITICAL_COVER_DAYS: int = 7
    
    class Config:
        env_file = ".env"
        extra = "ignore"

@lru_cache()
def get_settings():
    return Settings()
