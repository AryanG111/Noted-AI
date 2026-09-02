import os
from typing import Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Noted AI"
    API_V1_STR: str = "/api"
    
    # Security
    SECRET_KEY: str = "supersecretkey_change_me_in_production_1234567890"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/noted_ai"
    
    # ChromaDB
    CHROMA_DB_DIR: str = "./chroma_db"
    
    # LLM Settings
    ACTIVE_LLM_PROVIDER: str = "ollama"  # ollama, gemini, groq
    
    # API Keys & Endpoints
    GEMINI_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    
    # Default Models
    OLLAMA_MODEL: str = "gpt-oss:20b-cloud"
    OLLAMA_EMBED_MODEL: str = "nomic-embed-text"
    
    GEMINI_MODEL: str = "gemma-4-26b-a4b-it"
    GROQ_MODEL: str = "llama3-8b-8192"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
