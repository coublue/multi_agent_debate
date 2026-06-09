from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, Mapping, Protocol, Sequence, TypedDict


DEFAULT_DEEPSEEK_BASE_URL = "https://api.deepseek.com"
DEFAULT_DEEPSEEK_MODEL = "deepseek-v4-pro"
DEFAULT_TIMEOUT_SECONDS = 120.0
DEFAULT_TEMPERATURE = 0.2


class ChatMessage(TypedDict):
    role: str
    content: str


class ChatClient(Protocol):
    async def chat(
        self,
        messages: Sequence[ChatMessage],
        *,
        model: str | None = None,
        temperature: float | None = None,
    ) -> str:
        ...


class LLMError(Exception):
    """Base error for model client failures."""

    def __init__(self, message: str, *, details: Mapping[str, Any] | None = None) -> None:
        super().__init__(message)
        self.details = dict(details or {})


class LLMConfigurationError(LLMError):
    pass


class LLMTimeoutError(LLMError):
    pass


class LLMHTTPError(LLMError):
    pass


class LLMResponseError(LLMError):
    pass


@dataclass(frozen=True)
class LLMSettings:
    api_key: str | None = None
    base_url: str = DEFAULT_DEEPSEEK_BASE_URL
    model: str = DEFAULT_DEEPSEEK_MODEL
    timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS
    temperature: float = DEFAULT_TEMPERATURE


def _read_attr(settings: Any, names: Sequence[str], default: Any = None) -> Any:
    for name in names:
        value = getattr(settings, name, None)
        if value not in (None, ""):
            return value
    return default


def load_llm_settings(settings: Any | None = None) -> LLMSettings:
    """Load DeepSeek OpenAI-compatible settings with a light config fallback."""

    if settings is None:
        try:
            from app.config import get_settings  # type: ignore

            settings = get_settings()
        except Exception:
            settings = None

    api_key = _read_attr(settings, ("deepseek_api_key", "DEEPSEEK_API_KEY", "api_key"))
    base_url = _read_attr(
        settings,
        ("deepseek_base_url", "DEEPSEEK_BASE_URL", "llm_base_url"),
        DEFAULT_DEEPSEEK_BASE_URL,
    )
    model = _read_attr(
        settings,
        ("deepseek_model", "DEEPSEEK_MODEL", "llm_model"),
        DEFAULT_DEEPSEEK_MODEL,
    )
    timeout = _read_attr(
        settings,
        ("llm_timeout_seconds", "LLM_TIMEOUT_SECONDS", "timeout_seconds"),
        DEFAULT_TIMEOUT_SECONDS,
    )
    temperature = _read_attr(
        settings,
        ("llm_temperature", "LLM_TEMPERATURE", "temperature"),
        DEFAULT_TEMPERATURE,
    )

    return LLMSettings(
        api_key=api_key or os.getenv("DEEPSEEK_API_KEY"),
        base_url=(os.getenv("DEEPSEEK_BASE_URL") or str(base_url)).rstrip("/"),
        model=os.getenv("DEEPSEEK_MODEL") or str(model),
        timeout_seconds=float(os.getenv("LLM_TIMEOUT_SECONDS") or timeout),
        temperature=float(os.getenv("LLM_TEMPERATURE") or temperature),
    )


class MockChatClient:
    """Small async chat client for tests and local no-key development."""

    def __init__(self, response: str = "{}") -> None:
        self.response = response
        self.calls: list[dict[str, Any]] = []

    async def chat(
        self,
        messages: Sequence[ChatMessage],
        *,
        model: str | None = None,
        temperature: float | None = None,
    ) -> str:
        self.calls.append(
            {
                "messages": list(messages),
                "model": model,
                "temperature": temperature,
            }
        )
        return self.response


class DeepSeekChatClient:
    """Async DeepSeek client using the OpenAI-compatible SDK surface."""

    def __init__(
        self,
        settings: LLMSettings | Any | None = None,
        *,
        api_key: str | None = None,
        base_url: str | None = None,
        model: str | None = None,
        timeout_seconds: float | None = None,
        temperature: float | None = None,
        mock_client: ChatClient | None = None,
    ) -> None:
        loaded = settings if isinstance(settings, LLMSettings) else load_llm_settings(settings)
        self.api_key = api_key if api_key is not None else loaded.api_key
        self.base_url = (base_url or loaded.base_url).rstrip("/")
        self.model = model or loaded.model
        self.timeout_seconds = timeout_seconds or loaded.timeout_seconds
        self.temperature = temperature if temperature is not None else loaded.temperature
        self.mock_client = mock_client

    async def chat(
        self,
        messages: Sequence[ChatMessage],
        *,
        model: str | None = None,
        temperature: float | None = None,
    ) -> str:
        if self.mock_client is not None:
            return await self.mock_client.chat(
                messages,
                model=model or self.model,
                temperature=self.temperature if temperature is None else temperature,
            )

        if not self.api_key:
            return await MockChatClient().chat(
                messages,
                model=model or self.model,
                temperature=self.temperature if temperature is None else temperature,
            )

        try:
            from openai import APIConnectionError, APIStatusError, APITimeoutError, AsyncOpenAI
        except ImportError as exc:
            raise LLMConfigurationError(
                "openai is required for real DeepSeek OpenAI-compatible calls",
                details={"dependency": "openai"},
            ) from exc

        try:
            client = AsyncOpenAI(
                api_key=os.environ.get("DEEPSEEK_API_KEY") or self.api_key,
                base_url=os.environ.get("DEEPSEEK_BASE_URL") or self.base_url,
                timeout=self.timeout_seconds,
            )
            response = await client.chat.completions.create(
                model=os.environ.get("DEEPSEEK_MODEL") or model or self.model,
                messages=list(messages),
                temperature=self.temperature if temperature is None else temperature,
            )
        except APITimeoutError as exc:
            raise LLMTimeoutError(
                "LLM request timed out",
                details={"timeout_seconds": self.timeout_seconds},
            ) from exc
        except APIStatusError as exc:
            raise LLMHTTPError(
                "LLM request failed",
                details={
                    "status_code": exc.status_code,
                    "body": str(exc.response)[:1000],
                },
            ) from exc
        except APIConnectionError as exc:
            raise LLMHTTPError("LLM transport failed", details={"error": str(exc)}) from exc

        try:
            content = response.choices[0].message.content
        except (AttributeError, IndexError, TypeError) as exc:
            raise LLMResponseError(
                "LLM response did not contain choices[0].message.content",
                details={"response": repr(response)},
            ) from exc

        if not isinstance(content, str):
            raise LLMResponseError(
                "LLM message content was not text",
                details={"content_type": type(content).__name__},
            )
        return content
