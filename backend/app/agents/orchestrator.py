from __future__ import annotations

import inspect
from dataclasses import dataclass
from collections.abc import AsyncIterator
from typing import Any, Mapping, Protocol

from app.agents import ConAgent, JudgeAgent, ModeratorAgent, ProAgent
from app.agents.base import AgentRunResult
from app.models.debate import DebateStage


class DebateAgent(Protocol):
    name: str
    role: str


@dataclass(frozen=True)
class DebateStageResult:
    agent_name: str
    agent_role: str
    stage: DebateStage
    round_index: int
    message_type: str
    content: dict[str, Any]
    target_agent: str | None = None

    def to_message_dict(self) -> dict[str, Any]:
        return {
            "agent_name": self.agent_name,
            "agent_role": self.agent_role,
            "stage": self.stage,
            "round_index": self.round_index,
            "message_type": self.message_type,
            "content": self.content,
            "target_agent": self.target_agent,
        }


class OrchestrationError(Exception):
    def __init__(
        self,
        message: str,
        *,
        stage: DebateStage,
        completed_results: list[DebateStageResult],
    ) -> None:
        super().__init__(message)
        self.stage = stage
        self.completed_results = completed_results


class DebateOrchestrator:
    """Runs article debates and faster topic debates."""

    def __init__(
        self,
        *,
        moderator: DebateAgent | None = None,
        pro: DebateAgent | None = None,
        con: DebateAgent | None = None,
        judge: DebateAgent | None = None,
    ) -> None:
        self.moderator = moderator or ModeratorAgent()
        self.pro = pro or ProAgent()
        self.con = con or ConAgent()
        self.judge = judge or JudgeAgent()

    async def run(self, article: Mapping[str, Any] | str) -> list[DebateStageResult]:
        return [result async for result in self.run_iter(article)]

    async def run_iter(self, article: Mapping[str, Any] | str) -> AsyncIterator[DebateStageResult]:
        article_payload = self._normalize_article(article)
        if article_payload.get("debate_mode") == "topic":
            async for result in self._run_topic_iter(article_payload):
                yield result
            return

        async for result in self._run_article_iter(article_payload):
            yield result

    async def _run_article_iter(self, article_payload: dict[str, Any]) -> AsyncIterator[DebateStageResult]:
        user_question = article_payload.get("user_question")
        completed: list[DebateStageResult] = []
        outputs: dict[str, dict[str, Any]] = {}

        async def run_stage(
            *,
            stage: DebateStage,
            agent: DebateAgent,
            method_name: str,
            round_index: int,
            target_agent: str | None = None,
            args: tuple[Any, ...] = (),
        ) -> dict[str, Any]:
            try:
                raw_result = await self._call_agent(agent, method_name, *args)
                content = self._normalize_agent_output(raw_result)
            except Exception as exc:
                raise OrchestrationError(
                    f"{stage.value} failed: {exc}",
                    stage=stage,
                    completed_results=completed.copy(),
                ) from exc

            result = DebateStageResult(
                agent_name=getattr(agent, "name", method_name),
                agent_role=getattr(agent, "role", getattr(agent, "name", method_name)),
                stage=stage,
                round_index=round_index,
                message_type="json",
                content=content,
                target_agent=target_agent,
            )
            completed.append(result)
            outputs[stage.value] = content
            return result

        result = await run_stage(
            stage=DebateStage.MODERATOR_OPENING,
            agent=self.moderator,
            method_name="opening",
            round_index=1,
            args=(article_payload, user_question),
        )
        yield result
        result = await run_stage(
            stage=DebateStage.PRO_OPENING,
            agent=self.pro,
            method_name="opening",
            round_index=2,
            target_agent="con",
            args=(article_payload, outputs["moderator_opening"]),
        )
        yield result
        result = await run_stage(
            stage=DebateStage.CON_OPENING,
            agent=self.con,
            method_name="opening",
            round_index=3,
            target_agent="pro",
            args=(article_payload, outputs["moderator_opening"]),
        )
        yield result
        result = await run_stage(
            stage=DebateStage.PRO_REBUTTAL,
            agent=self.pro,
            method_name="rebuttal",
            round_index=4,
            target_agent="con",
            args=(
                article_payload,
                outputs["moderator_opening"],
                outputs["pro_opening"],
                outputs["con_opening"],
            ),
        )
        yield result
        result = await run_stage(
            stage=DebateStage.CON_REBUTTAL,
            agent=self.con,
            method_name="rebuttal",
            round_index=5,
            target_agent="pro",
            args=(
                article_payload,
                outputs["moderator_opening"],
                outputs["pro_opening"],
                outputs["con_opening"],
                outputs["pro_rebuttal"],
            ),
        )
        yield result
        result = await run_stage(
            stage=DebateStage.MODERATOR_MIDPOINT,
            agent=self.moderator,
            method_name="midpoint",
            round_index=6,
            args=(
                article_payload,
                outputs["moderator_opening"],
                outputs["pro_opening"],
                outputs["con_opening"],
                outputs["pro_rebuttal"],
                outputs["con_rebuttal"],
            ),
        )
        yield result
        result = await run_stage(
            stage=DebateStage.PRO_CLOSING,
            agent=self.pro,
            method_name="closing",
            round_index=7,
            target_agent="judge",
            args=(
                outputs["moderator_opening"],
                outputs["moderator_midpoint"],
                outputs["con_rebuttal"],
            ),
        )
        yield result
        result = await run_stage(
            stage=DebateStage.CON_CLOSING,
            agent=self.con,
            method_name="closing",
            round_index=8,
            target_agent="judge",
            args=(
                outputs["moderator_opening"],
                outputs["moderator_midpoint"],
                outputs["pro_rebuttal"],
            ),
        )
        yield result
        result = await run_stage(
            stage=DebateStage.JUDGE_REPORT,
            agent=self.judge,
            method_name="report",
            round_index=9,
            args=(
                article_payload,
                outputs["moderator_opening"],
                outputs["moderator_midpoint"],
                outputs["pro_opening"],
                outputs["con_opening"],
                outputs["pro_rebuttal"],
                outputs["con_rebuttal"],
                outputs["pro_closing"],
                outputs["con_closing"],
            ),
        )
        yield result

    async def _run_topic_iter(self, article_payload: dict[str, Any]) -> AsyncIterator[DebateStageResult]:
        user_question = article_payload.get("user_question")
        completed: list[DebateStageResult] = []
        outputs: dict[str, dict[str, Any]] = {}

        async def run_stage(
            *,
            stage: DebateStage,
            agent: DebateAgent,
            method_name: str,
            round_index: int,
            target_agent: str | None = None,
            args: tuple[Any, ...] = (),
        ) -> dict[str, Any]:
            try:
                raw_result = await self._call_agent(agent, method_name, *args)
                content = self._normalize_agent_output(raw_result)
            except Exception as exc:
                raise OrchestrationError(
                    f"{stage.value} failed: {exc}",
                    stage=stage,
                    completed_results=completed.copy(),
                ) from exc

            result = DebateStageResult(
                agent_name=getattr(agent, "name", method_name),
                agent_role=getattr(agent, "role", getattr(agent, "name", method_name)),
                stage=stage,
                round_index=round_index,
                message_type="json",
                content=content,
                target_agent=target_agent,
            )
            completed.append(result)
            outputs[stage.value] = content
            return result

        result = await run_stage(
            stage=DebateStage.MODERATOR_OPENING,
            agent=self.moderator,
            method_name="opening",
            round_index=1,
            args=(article_payload, user_question),
        )
        yield result
        result = await run_stage(
            stage=DebateStage.PRO_OPENING,
            agent=self.pro,
            method_name="opening",
            round_index=2,
            target_agent="con",
            args=(article_payload, outputs["moderator_opening"]),
        )
        yield result
        result = await run_stage(
            stage=DebateStage.CON_OPENING,
            agent=self.con,
            method_name="opening",
            round_index=3,
            target_agent="pro",
            args=(article_payload, outputs["moderator_opening"]),
        )
        yield result
        result = await run_stage(
            stage=DebateStage.MODERATOR_MIDPOINT,
            agent=self.moderator,
            method_name="midpoint",
            round_index=4,
            args=(
                article_payload,
                outputs["moderator_opening"],
                outputs["pro_opening"],
                outputs["con_opening"],
                {},
                {},
            ),
        )
        yield result
        result = await run_stage(
            stage=DebateStage.JUDGE_REPORT,
            agent=self.judge,
            method_name="report",
            round_index=5,
            args=(
                article_payload,
                outputs["moderator_opening"],
                outputs["moderator_midpoint"],
                outputs["pro_opening"],
                outputs["con_opening"],
                {},
                {},
                {},
                {},
            ),
        )
        yield result

    @staticmethod
    async def _call_agent(agent: DebateAgent, method_name: str, *args: Any) -> Any:
        method = getattr(agent, method_name)
        result = method(*args)
        if inspect.isawaitable(result):
            return await result
        return result

    @staticmethod
    def _normalize_agent_output(result: Any) -> dict[str, Any]:
        if isinstance(result, AgentRunResult):
            if not result.ok:
                error = result.error or {"message": "Agent returned an error"}
                raise RuntimeError(error.get("message", "Agent returned an error"))
            result = result.data

        if isinstance(result, Mapping):
            return dict(result)
        return {"value": result}

    @staticmethod
    def _normalize_article(article: Mapping[str, Any] | str) -> dict[str, Any]:
        if isinstance(article, str):
            return {"content": article}
        return dict(article)
