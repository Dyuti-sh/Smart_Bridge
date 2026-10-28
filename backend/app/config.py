import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional

# Base backend directory
BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "WanderWise AI – Personalized Travel Itinerary Planner"
    VERSION: str = "2.0.0"
    API_V1_PREFIX: str = "/api"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "*"
    ]
    
    # Supabase Configuration
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    
    # Local Development & Storage fallback
    DEV_MODE: bool = True
    SQLITE_DB_PATH: str = str(BASE_DIR / "wanderwise.db")
    
    # Standard Dev User ID for seamless local dev & demos
    DEFAULT_DEV_USER_ID: str = "00000000-0000-0000-0000-000000000001"
    DEFAULT_DEV_USER_EMAIL: str = "demo@wanderwise.ai"
    DEFAULT_DEV_USER_NAME: str = "WanderWise Explorer"

    # AI Provider Configuration (Part 2)
    # Supported: nvidia, openai, groq, gemini, or custom openai-compatible
    AI_PROVIDER: str = "nvidia"
    
    # NVIDIA NIM configuration
    NVIDIA_API_KEY: str = ""
    NVIDIA_MODEL: str = "nvidia/nemotron-3.5-bolt-e4b"
    NVIDIA_BASE_URL: str = "https://integrate.api.nvidia.com/v1"
    
    # OpenAI configuration
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    
    # Groq configuration
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"
    
    # Google Gemini configuration
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def is_supabase_configured(self) -> bool:
        """Check if valid Supabase credentials have been provided."""
        return bool(
            self.SUPABASE_URL 
            and self.SUPABASE_URL.startswith("http") 
            and (self.SUPABASE_SERVICE_KEY or self.SUPABASE_ANON_KEY)
            and "your-supabase" not in self.SUPABASE_URL.lower()
        )

    @property
    def active_provider(self) -> str:
        """Determine active AI provider based on configuration and available keys."""
        p = (self.AI_PROVIDER or "").lower().strip()
        if p == "nvidia" and self.NVIDIA_API_KEY:
            return "nvidia"
        if p == "openai" and self.OPENAI_API_KEY:
            return "openai"
        if p == "groq" and self.GROQ_API_KEY:
            return "groq"
        if p == "gemini" and self.GEMINI_API_KEY:
            return "gemini"
        
        # Auto-detect if provider not matched but key exists
        if self.NVIDIA_API_KEY:
            return "nvidia"
        if self.OPENAI_API_KEY:
            return "openai"
        if self.GROQ_API_KEY:
            return "groq"
        if self.GEMINI_API_KEY:
            return "gemini"
        return "none"

    @property
    def is_ai_configured(self) -> bool:
        """Returns True if any supported AI provider has a valid key configured."""
        return self.active_provider != "none"

    @property
    def active_model(self) -> str:
        provider = self.active_provider
        if provider == "nvidia":
            return self.NVIDIA_MODEL or "nvidia/nemotron-3.5-bolt-e4b"
        elif provider == "openai":
            return self.OPENAI_MODEL or "gpt-4o-mini"
        elif provider == "groq":
            return self.GROQ_MODEL or "llama-3.3-70b-versatile"
        elif provider == "gemini":
            return self.GEMINI_MODEL or "gemini-2.0-flash"
        return "none"

settings = Settings()
