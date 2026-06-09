from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlmodel import Session, select

from app.agents.orchestrator import (
    DebateOrchestrator,
    DebateStageResult,
    OrchestrationError,
)
from app.models.agent_message import AgentMessage
from app.models.article import Article
from app.models.debate import Debate, DebateStage, DebateStatus
from app.services.article_service import get_article


def create_debate(session: Session, article_id: int) -> Debate:
    article = get_article(session, article_id)
    if article is None:
        raise ValueError(f"Article {article_id} not found")

    debate = Debate(article_id=article_id, status=DebateStatus.PENDING)
    session.add(debate)
    session.commit()
    session.refresh(debate)
    return debate


async def create_and_run_debate(
    session: Session,
    article_id: int,
    *,
    orchestrator: DebateOrchestrator | None = None,
) -> Debate:
    debate = create_debate(session, article_id)
    return await run_debate(session, debate.id, orchestrator=orchestrator)


async def run_debate(
    session: Session,
    debate_id: int | None,
    *,
    orchestrator: DebateOrchestrator | None = None,
) -> Debate:
    if debate_id is None:
        raise ValueError("Debate id is required")

    debate = session.get(Debate, debate_id)
    if debate is None:
        raise ValueError(f"Debate {debate_id} not found")

    article = get_article(session, debate.article_id)
    if article is None:
        raise ValueError(f"Article {debate.article_id} not found")

    debate.status = DebateStatus.RUNNING
    debate.error_message = None
    debate.updated_at = datetime.now(UTC)
    session.add(debate)
    session.commit()
    session.refresh(debate)

    runner = orchestrator or DebateOrchestrator()
    try:
        results = await runner.run(_article_payload(article))
        _save_stage_results(session, debate, results)
        _apply_success_fields(debate, results)
        debate.status = DebateStatus.COMPLETED
    except OrchestrationError as exc:
        _save_stage_results(session, debate, exc.completed_results)
        _apply_partial_fields(debate, exc.completed_results)
        debate.status = DebateStatus.FAILED
        debate.error_message = str(exc)
    except Exception as exc:
        debate.status = DebateStatus.FAILED
        debate.error_message = str(exc)

    debate.updated_at = datetime.now(UTC)
    session.add(debate)
    session.commit()
    session.refresh(debate)
    return debate


def get_debate(session: Session, debate_id: int) -> Debate | None:
    return session.get(Debate, debate_id)


def list_debates(session: Session, *, offset: int = 0, limit: int = 50) -> list[Debate]:
    statement = (
        select(Debate)
        .order_by(Debate.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    return list(session.exec(statement).all())


def list_debate_messages(session: Session, debate_id: int) -> list[AgentMessage]:
    statement = (
        select(AgentMessage)
        .where(AgentMessage.debate_id == debate_id)
        .order_by(AgentMessage.round_index.asc(), AgentMessage.created_at.asc())
    )
    return list(session.exec(statement).all())


def delete_debate(session: Session, debate_id: int) -> bool:
    debate = session.get(Debate, debate_id)
    if debate is None:
        return False

    messages = session.exec(
        select(AgentMessage).where(AgentMessage.debate_id == debate_id)
    ).all()
    for message in messages:
        session.delete(message)

    session.delete(debate)
    session.commit()
    return True


def _save_stage_results(
    session: Session,
    debate: Debate,
    results: list[DebateStageResult],
) -> list[AgentMessage]:
    saved: list[AgentMessage] = []
    for result in results:
        message = AgentMessage(debate_id=debate.id, **result.to_message_dict())
        session.add(message)
        saved.append(message)
    session.commit()
    for message in saved:
        session.refresh(message)
    return saved


def _apply_success_fields(debate: Debate, results: list[DebateStageResult]) -> None:
    by_stage = _results_by_stage(results)
    moderator_opening = by_stage.get(DebateStage.MODERATOR_OPENING, {})
    judge_report = by_stage.get(DebateStage.JUDGE_REPORT, {})

    debate.main_claim = (
        _as_optional_str(moderator_opening.get("main_claim"))
        or _as_optional_str(judge_report.get("main_claim"))
    )
    debate.debate_topic = _as_optional_str(moderator_opening.get("debate_topic"))
    debate.final_report = judge_report or None
    debate.winner = _as_optional_str(judge_report.get("winner"))
    debate.credibility_score = _as_optional_int(judge_report.get("credibility_score"))


def _apply_partial_fields(debate: Debate, results: list[DebateStageResult]) -> None:
    by_stage = _results_by_stage(results)
    moderator_opening = by_stage.get(DebateStage.MODERATOR_OPENING, {})
    if moderator_opening:
        debate.main_claim = _as_optional_str(moderator_opening.get("main_claim"))
        debate.debate_topic = _as_optional_str(moderator_opening.get("debate_topic"))


def _results_by_stage(results: list[DebateStageResult]) -> dict[DebateStage, dict[str, Any]]:
    return {result.stage: result.content for result in results}


def _article_payload(article: Article) -> dict[str, Any]:
    return {
        "id": article.id,
        "title": article.title,
        "source": article.source,
        "content": article.content,
        "user_question": article.user_question,
        "created_at": article.created_at.isoformat(),
    }


def _as_optional_str(value: Any) -> str | None:
    if value is None:
        return None
    return str(value)


def _as_optional_int(value: Any) -> int | None:
    if value is None:
        return None
    return int(value)
