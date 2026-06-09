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


class JudgeAgent(BaseAgent):
    """Judge wrapper for final debate report generation."""

    name = "judge"
    role = "judge"

    async def report(
        self,
        article: dict[str, Any] | str,
        moderator_opening: Any,
        moderator_midpoint: Any,
        pro_opening: Any,
        con_opening: Any,
        pro_rebuttal: Any,
        con_rebuttal: Any,
        pro_closing: Any,
        con_closing: Any,
    ) -> Any:
        prompt_file = "topic_judge.txt" if _is_topic_debate(article) else "judge.txt"
        return await self._run_stage(
            "judge_report",
            prompt_file,
            {
                "article": article,
                "moderator_opening": moderator_opening,
                "moderator_midpoint": moderator_midpoint,
                "pro_opening": pro_opening,
                "con_opening": con_opening,
                "pro_rebuttal": pro_rebuttal,
                "con_rebuttal": con_rebuttal,
                "pro_closing": pro_closing,
                "con_closing": con_closing,
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
