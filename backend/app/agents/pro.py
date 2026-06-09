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


class ProAgent(BaseAgent):
    """Pro-side wrapper for article-supporting debate stages."""

    name = "pro"
    role = "pro"

    async def opening(self, article: dict[str, Any] | str, moderator_opening: Any) -> Any:
        prompt_file = "topic_pro_opening.txt" if _is_topic_debate(article) else "pro_opening.txt"
        return await self._run_stage(
            "pro_opening",
            prompt_file,
            {"article": article, "moderator_opening": moderator_opening},
        )

    async def rebuttal(
        self,
        article: dict[str, Any] | str,
        moderator_opening: Any,
        pro_opening: Any,
        con_opening: Any,
    ) -> Any:
        return await self._run_stage(
            "pro_rebuttal",
            "pro_rebuttal.txt",
            {
                "article": article,
                "moderator_opening": moderator_opening,
                "pro_opening": pro_opening,
                "con_opening": con_opening,
            },
        )

    async def closing(
        self,
        article_summary: Any,
        moderator_midpoint: Any,
        con_strongest_points: Any,
    ) -> Any:
        return await self._run_stage(
            "pro_closing",
            "pro_closing.txt",
            {
                "article_summary": article_summary,
                "moderator_midpoint": moderator_midpoint,
                "con_strongest_points": con_strongest_points,
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
