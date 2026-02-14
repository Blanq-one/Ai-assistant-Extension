"""
Configuration module following Single Responsibility Principle.
Handles all application configuration from environment variables.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Groq Configuration (FREE - no credit card needed!)
    groq_api_key: str = ""
    
    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False
    
    # CORS Configuration
    allowed_origins: str = "chrome-extension://*,http://localhost:*"
    
    @property
    def cors_origins(self) -> List[str]:
        """Parse comma-separated origins into a list."""
        return [origin.strip() for origin in self.allowed_origins.split(",")]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # Ignore extra fields in .env


@lru_cache()
def get_settings() -> Settings:
    """
    Cached settings instance - Dependency Injection ready.
    Following Dependency Inversion Principle.
    """
    return Settings()

