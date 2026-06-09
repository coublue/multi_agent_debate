from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping, Sequence

from app.llm import ChatClient, ChatMessage, DeepSeekChatClient, LLMError


class AgentError(Exception):
    def __init__(
        self,
        message: str,
        *,
        code: str,
        details: Mapping[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.details = dict(details or {})

    def to_dict(self) -> dict[str, Any]:
        return {
            "code": self.code,
            "message": str(self),
            "details": self.details,
        }


class PromptLoadError(AgentError):
    pass


class AgentOutputParseError(AgentError):
    pass


@dataclass(frozen=True)
class AgentRunResult:
    ok: bool
    data: Any | None = None
    raw_output: str | None = None
    rendered_prompt: str | None = None
    error: dict[str, Any] | None = None


class BaseAgent:
    name = "base"
    role = "base"

    def __init__(
        self,
        *,
        prompt_path: str | Path | None = None,
        llm_client: ChatClient | None = None,
        model: str | None = None,
        temperature: float | None = None,
    ) -> None:
        self.prompt_path = Path(prompt_path) if prompt_path is not None else None
        self.llm_client = llm_client or DeepSeekChatClient()
        self.model = model
        self.temperature = temperature

    def load_prompt(self) -> str:
        if self.prompt_path is None:
            raise PromptLoadError(
                "No prompt path configured for agent",
                code="prompt_path_missing",
                details={"agent": self.name},
            )
        try:
            return self.prompt_path.read_text(encoding="utf-8")
        except OSError as exc:
            raise PromptLoadError(
                "Could not load agent prompt",
                code="prompt_load_failed",
                details={"prompt_path": str(self.prompt_path), "error": str(exc)},
            ) from exc

    def render_prompt(self, variables: Mapping[str, Any] | None = None) -> str:
        prompt = self.load_prompt()
        return self.render_prompt_text(prompt, variables)

    @staticmethod
    def render_prompt_text(prompt: str, variables: Mapping[str, Any] | None = None) -> str:
        values = dict(variables or {})

        def replace(match: re.Match[str]) -> str:
            key = match.group("double") or match.group("single")
            if key in values:
                return str(values[key])
            return match.group(0)

        return re.sub(
            r"\{\{\s*(?P<double>[a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}|\{(?P<single>[a-zA-Z_][a-zA-Z0-9_]*)\}",
            replace,
            prompt,
        )

    async def run(self, **variables: Any) -> AgentRunResult:
        return await self.run_prompt(prompt=None, context=variables)

    async def run_prompt(
        self,
        prompt: str | None = None,
        context: Mapping[str, Any] | None = None,
        stage: str | None = None,
    ) -> AgentRunResult:
        rendered_prompt = ""
        raw_output: str | None = None
        try:
            variables = dict(context or {})
            if stage is not None:
                variables.setdefault("stage", stage)
            rendered_prompt = (
                self.render_prompt(variables)
                if prompt is None
                else self.render_prompt_text(prompt, variables)
            )
            rendered_prompt = self._append_context_block(rendered_prompt, variables)
            raw_output = await self.call_llm(rendered_prompt)
            try:
                data = self.parse_json(raw_output)
            except AgentOutputParseError as parse_error:
                repaired_output = await self.repair_json_output(raw_output, parse_error)
                data = self.parse_json(repaired_output)
                raw_output = repaired_output
            return AgentRunResult(
                ok=True,
                data=data,
                raw_output=raw_output,
                rendered_prompt=rendered_prompt,
            )
        except AgentError as exc:
            return AgentRunResult(
                ok=False,
                raw_output=raw_output,
                rendered_prompt=rendered_prompt or None,
                error=exc.to_dict(),
            )
        except LLMError as exc:
            return AgentRunResult(
                ok=False,
                raw_output=raw_output,
                rendered_prompt=rendered_prompt or None,
                error={
                    "code": "llm_call_failed",
                    "message": str(exc),
                    "details": exc.details,
                },
            )
        except Exception as exc:
            return AgentRunResult(
                ok=False,
                raw_output=raw_output,
                rendered_prompt=rendered_prompt or None,
                error={
                    "code": "agent_failed",
                    "message": str(exc),
                    "details": {"agent": self.name},
                },
            )

    async def call_llm(self, prompt: str) -> str:
        messages: Sequence[ChatMessage] = [{"role": "user", "content": prompt}]
        return await self.llm_client.chat(
            messages,
            model=self.model,
            temperature=self.temperature,
        )

    async def repair_json_output(
        self,
        raw_output: str,
        parse_error: AgentOutputParseError,
    ) -> str:
        repair_prompt = (
            "你刚才的输出不是合法 JSON。请只把下面内容修复为一个合法 JSON 对象或数组，"
            "不要添加解释、Markdown 代码块或额外文本。必须保留原有语义和字段。\n\n"
            f"解析错误：{parse_error}\n\n"
            "原始输出：\n"
            f"{raw_output}"
        )
        return await self.call_llm(repair_prompt)

    @staticmethod
    def _append_context_block(prompt: str, variables: Mapping[str, Any]) -> str:
        if not variables:
            return prompt

        context_json = json.dumps(
            dict(variables),
            ensure_ascii=False,
            indent=2,
            default=str,
        )
        return (
            f"{prompt.rstrip()}\n\n"
            "实际输入 JSON：\n"
            "```json\n"
            f"{context_json}\n"
            "```"
        )

    @classmethod
    def parse_json(cls, text: str) -> Any:
        cleaned = cls._strip_json_fence(text).strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass

        candidate = cls._extract_first_json_value(cleaned)
        if candidate is None:
            raise AgentOutputParseError(
                "Agent output did not contain a JSON object or array",
                code="json_not_found",
                details={"output_preview": text[:500]},
            )

        try:
            return json.loads(candidate)
        except json.JSONDecodeError as exc:
            raise AgentOutputParseError(
                "Agent output contained invalid JSON",
                code="json_invalid",
                details={"error": str(exc), "json_preview": candidate[:500]},
            ) from exc

    @staticmethod
    def _strip_json_fence(text: str) -> str:
        stripped = text.strip()
        fence = re.fullmatch(r"```(?:json)?\s*(?P<body>.*?)\s*```", stripped, re.DOTALL)
        if fence:
            return fence.group("body")
        return text

    @staticmethod
    def _extract_first_json_value(text: str) -> str | None:
        start_positions = [
            (index, char)
            for index, char in enumerate(text)
            if char in ("{", "[")
        ]
        for start, opening in start_positions:
            closing = "}" if opening == "{" else "]"
            stack: list[str] = []
            in_string = False
            escape = False

            for index in range(start, len(text)):
                char = text[index]
                if in_string:
                    if escape:
                        escape = False
                    elif char == "\\":
                        escape = True
                    elif char == '"':
                        in_string = False
                    continue

                if char == '"':
                    in_string = True
                elif char in ("{", "["):
                    stack.append("}" if char == "{" else "]")
                elif char in ("}", "]"):
                    if not stack or char != stack.pop():
                        break
                    if not stack and char == closing:
                        return text[start : index + 1]

        return None
