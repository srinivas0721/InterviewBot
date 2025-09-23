from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    database_url: str = os.getenv("DATABASE_URL", "postgresql://localhost/interview_bot")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    session_secret: str = os.getenv("SESSION_SECRET", "interview-bot-secret-key")
    environment: str = os.getenv("NODE_ENV", "development")
    
    class Config:
        env_file = ".env"

settings = Settings()