from pydantic_settings import BaseSettings
from pydantic import Field, model_validator

# Public fallback used only for local development. It must never be used to sign
# session cookies in production, otherwise sessions are trivially forgeable.
DEFAULT_DEV_SESSION_SECRET = "interview-bot-secret-key"


class Settings(BaseSettings):
    database_url: str = "postgresql://localhost/interview_bot"
    gemini_api_key: str = ""
    session_secret: str = DEFAULT_DEV_SESSION_SECRET
    environment: str = Field(default="development", alias="NODE_ENV")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        populate_by_name = True

    @model_validator(mode="after")
    def _require_secure_secret_in_production(self):
        if self.environment == "production" and self.session_secret == DEFAULT_DEV_SESSION_SECRET:
            raise ValueError(
                "SESSION_SECRET must be set to a strong, unique value in production. "
                "Refusing to start with the default development secret because it would "
                "make session cookies forgeable."
            )
        return self


settings = Settings()