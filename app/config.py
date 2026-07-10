from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    database_url: str = "postgresql://localhost/interview_bot"
    gemini_api_key: str = ""
    session_secret: str = "interview-bot-secret-key"
    environment: str = Field(default="development", alias="NODE_ENV")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        populate_by_name = True


settings = Settings()