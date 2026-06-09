from __future__ import annotations

import asyncio
from typing import Any

from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from app.agents.orchestrator import DebateOrchestrator
from app.models.agent_message import AgentMessage
from app.models.debate import DebateStage, DebateStatus
from app.schemas.article import ArticleCreate
from app.services.article_service import create_article
from app.services.debate_service import create_and_run_debate


class FakeModeratorAgent:
    name = "fake_moderator"
    role = "moderator"

    async def opening(self, article: dict[str, Any], user_question: str | None = None) -> dict[str, Any]:
        return {
            "main_claim": "Local debates can evaluate article credibility.",
            "debate_topic": "Whether the article's claim is well supported",
            "key_points": [article["title"]],
            "controversial_points": [user_question or "No user question"],
            "rules": ["Use article evidence"],
        }

    async def midpoint(
        self,
        article: dict[str, Any],
        moderator_opening: dict[str, Any],
        pro_opening: dict[str, Any],
        con_opening: dict[str, Any],
        pro_rebuttal: dict[str, Any],
        con_rebuttal: dict[str, Any],
    ) -> dict[str, Any]:
        return {
            "pro_summary": pro_opening["summary"],
            "con_summary": con_opening["summary"],
            "key_disagreements": ["Evidence strength"],
            "unresolved_questions": ["Sample size"],
            "focus_for_closing": "Clarify confidence",
        }


class FakeProAgent:
    name = "fake_pro"
    role = "pro"

    async def opening(
        self,
        article: dict[str, Any],
        moderator_opening: dict[str, Any],
    ) -> dict[str, Any]:
        return {"summary": "The article is mostly credible.", "evidence": [article["content"][:20]]}

    async def rebuttal(
        self,
        article: dict[str, Any],
        moderator_opening: dict[str, Any],
        pro_opening: dict[str, Any],
        con_opening: dict[str, Any],
    ) -> dict[str, Any]:
        return {"summary": "The skeptical critique misses direct support.", "rebuttals": ["support"]}

    async def closing(
        self,
        article_summary: dict[str, Any],
        moderator_midpoint: dict[str, Any],
        con_strongest_points: dict[str, Any],
    ) -> dict[str, Any]:
        return {"summary": "The core claim remains supported.", "key_points": ["support remains"]}


class FakeConAgent:
    name = "fake_con"
    role = "con"

    async def opening(
        self,
        article: dict[str, Any],
        moderator_opening: dict[str, Any],
    ) -> dict[str, Any]:
        return {"summary": "The article leaves important doubts.", "limitations": ["missing data"]}

    async def rebuttal(
        self,
        article: dict[str, Any],
        moderator_opening: dict[str, Any],
        pro_opening: dict[str, Any],
        con_opening: dict[str, Any],
        pro_rebuttal: dict[str, Any],
    ) -> dict[str, Any]:
        return {"summary": "The pro side overstates certainty.", "rebuttals": ["certainty"]}

    async def closing(
        self,
        article_summary: dict[str, Any],
        moderator_midpoint: dict[str, Any],
        pro_strongest_points: dict[str, Any],
    ) -> dict[str, Any]:
        return {"summary": "Credibility should be treated as mixed.", "key_points": ["caution"]}


class FailingConAgent(FakeConAgent):
    async def opening(
        self,
        article: dict[str, Any],
        moderator_opening: dict[str, Any],
    ) -> dict[str, Any]:
        raise RuntimeError("con opening failed")


class FakeJudgeAgent:
    name = "fake_judge"
    role = "judge"

    async def report(
        self,
        article: dict[str, Any],
        moderator_opening: dict[str, Any],
        moderator_midpoint: dict[str, Any],
        pro_opening: dict[str, Any],
        con_opening: dict[str, Any],
        pro_rebuttal: dict[str, Any],
        con_rebuttal: dict[str, Any],
        pro_closing: dict[str, Any],
        con_closing: dict[str, Any],
    ) -> dict[str, Any]:
        return {
            "main_claim": moderator_opening["main_claim"],
            "pro_strongest_points": ["direct support"],
            "con_strongest_points": ["missing data"],
            "key_disagreements": moderator_midpoint["key_disagreements"],
            "winner": "mixed",
            "credibility_score": 72,
            "credible_parts": ["core claim"],
            "questionable_parts": ["confidence level"],
            "follow_up_questions": ["What data backs the claim?"],
            "final_summary": "The article is plausible but not definitive.",
        }


def _orchestrator() -> DebateOrchestrator:
    return DebateOrchestrator(
        moderator=FakeModeratorAgent(),
        pro=FakeProAgent(),
        con=FakeConAgent(),
        judge=FakeJudgeAgent(),
    )


def _failing_orchestrator() -> DebateOrchestrator:
    return DebateOrchestrator(
        moderator=FakeModeratorAgent(),
        pro=FakeProAgent(),
        con=FailingConAgent(),
        judge=FakeJudgeAgent(),
    )


def test_orchestrator_runs_fixed_nine_stage_flow_with_fake_agents() -> None:
    results = asyncio.run(
        _orchestrator().run(
            {
                "title": "Local Article",
                "content": "Evidence-rich article content",
                "user_question": "Is it credible?",
            }
        )
    )

    assert [result.stage for result in results] == [
        DebateStage.MODERATOR_OPENING,
        DebateStage.PRO_OPENING,
        DebateStage.CON_OPENING,
        DebateStage.PRO_REBUTTAL,
        DebateStage.CON_REBUTTAL,
        DebateStage.MODERATOR_MIDPOINT,
        DebateStage.PRO_CLOSING,
        DebateStage.CON_CLOSING,
        DebateStage.JUDGE_REPORT,
    ]
    assert [result.round_index for result in results] == list(range(1, 10))
    assert all(result.message_type == "json" for result in results)
    assert results[0].content["main_claim"] == "Local debates can evaluate article credibility."
    assert results[-1].content["winner"] == "mixed"
    assert results[-1].content["credibility_score"] == 72


def test_debate_service_persists_messages_and_updates_final_fields() -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        article = create_article(
            session,
            ArticleCreate(
                title="Local Article",
                content="Evidence-rich article content",
                user_question="Is it credible?",
            ),
        )

        debate = asyncio.run(
            create_and_run_debate(session, article.id, orchestrator=_orchestrator())
        )

        messages = list(
            session.exec(
                select(AgentMessage)
                .where(AgentMessage.debate_id == debate.id)
                .order_by(AgentMessage.round_index)
            ).all()
        )

    assert debate.status == DebateStatus.COMPLETED
    assert debate.main_claim == "Local debates can evaluate article credibility."
    assert debate.debate_topic == "Whether the article's claim is well supported"
    assert debate.winner == "mixed"
    assert debate.credibility_score == 72
    assert debate.final_report["final_summary"] == "The article is plausible but not definitive."
    assert len(messages) == 9
    assert messages[-1].stage == DebateStage.JUDGE_REPORT


def test_debate_service_failure_preserves_completed_stage_messages() -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        article = create_article(
            session,
            ArticleCreate(
                title="Local Article",
                content="Evidence-rich article content",
                user_question="Is it credible?",
            ),
        )

        debate = asyncio.run(
            create_and_run_debate(session, article.id, orchestrator=_failing_orchestrator())
        )

        messages = list(
            session.exec(
                select(AgentMessage)
                .where(AgentMessage.debate_id == debate.id)
                .order_by(AgentMessage.round_index)
            ).all()
        )

    assert debate.status == DebateStatus.FAILED
    assert "con_opening failed" in debate.error_message
    assert debate.main_claim == "Local debates can evaluate article credibility."
    assert debate.debate_topic == "Whether the article's claim is well supported"
    assert debate.final_report is None
    assert len(messages) == 2
    assert [message.stage for message in messages] == [
        DebateStage.MODERATOR_OPENING,
        DebateStage.PRO_OPENING,
    ]
