from __future__ import annotations

import inspect
from pathlib import Path
from typing import Any

try:
    from .base import BaseAgent
except ImportError:

    class BaseAgent:  # type: ignore[no-redef]
        async def run_prompt(
            self, prompt: str, context: dict[str, Any] | None = None, stage: str | None = None
        ) -> dict[str, Any]:
            return {"stage": stage, "prompt": prompt, "context": context or {}}


PROMPT_DIR = Path(__file__).resolve().parent.parent / "prompts"


class ModeratorAgent(BaseAgent):
    """Moderator wrapper for opening framing and midpoint compression."""

    name = "moderator"
    role = "moderator"

    async def opening(
        self,
        article: dict[str, Any] | str,
        user_question: str | None = None,
    ) -> Any:
        prompt_file = (
            "topic_moderator_opening.txt"
            if _is_topic_debate(article)
            else "moderator_opening.txt"
        )
        return await self._run_stage(
            "moderator_opening",
            prompt_file,
            {"article": article, "user_question": user_question},
        )

    async def midpoint(
        self,
        article: dict[str, Any] | str,
        moderator_opening: Any,
        pro_opening: Any,
        con_opening: Any,
        pro_rebuttal: Any,
        con_rebuttal: Any,
    ) -> Any:
        prompt_file = (
            "topic_moderator_midpoint.txt"
            if _is_topic_debate(article)
            else "moderator_midpoint.txt"
        )
        return await self._run_stage(
            "moderator_midpoint",
            prompt_file,
            {
                "article": article,
                "moderator_opening": moderator_opening,
                "pro_opening": pro_opening,
                "con_opening": con_opening,
                "pro_rebuttal": pro_rebuttal,
                "con_rebuttal": con_rebuttal,
            },
        )

    async def _run_stage(self, stage: str, prompt_file: str, context: dict[str, Any]) -> Any:
        prompt = (PROMPT_DIR / prompt_file).read_text(encoding="utf-8")
        runner = getattr(super(), "run_prompt", None)
        if callable(runner):
            result = runner(prompt=prompt, context=context, stage=stage)
        else:
            result = {"stage": stage, "prompt": prompt, "context": context}
        if inspect.isawaitable(result):
            return await result
        return result


def _is_topic_debate(article: dict[str, Any] | str) -> bool:
    return isinstance(article, dict) and article.get("debate_mode") == "topic"
