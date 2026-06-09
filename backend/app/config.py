from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Multi Agent Debate"
    app_version: str = "0.1.0"

    deepseek_api_key: str = Field(default="", alias="DEEPSEEK_API_KEY")
    deepseek_base_url: str = Field(
        default="https://api.deepseek.com",
        alias="DEEPSEEK_BASE_URL",
    )
    deepseek_model: str = Field(default="deepseek-v4-pro", alias="DEEPSEEK_MODEL")

    database_url: str = Field(default="sqlite:///./debate_assistant.db", alias="DATABASE_URL")
    max_article_chars: int = Field(default=12000, alias="MAX_ARTICLE_CHARS")
    max_agent_output_chars: int = Field(default=2500, alias="MAX_AGENT_OUTPUT_CHARS")
    debate_rounds: int = Field(default=3, alias="DEBATE_ROUNDS")
    llm_timeout_seconds: float = Field(default=120.0, alias="LLM_TIMEOUT_SECONDS")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        populate_by_name=True,
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
