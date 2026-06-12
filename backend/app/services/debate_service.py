from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlmodel import Session, select

from app.db import engine
from app.agents.orchestrator import (
    DebateOrchestrator,
    DebateStageResult,
    OrchestrationError,
)
from app.models.agent_message import AgentMessage
from app.models.article import Article
from app.models.debate import (
    Debate,
    DebateDepth,
    DebateStage,
    DebateStatus,
    OutputStyle,
    StageMode,
)
from app.services.article_service import get_article


def create_debate(
    session: Session,
    article_id: int,
    *,
    debate_depth: DebateDepth | str = DebateDepth.STANDARD,
    output_style: OutputStyle | str | None = None,
    stage_mode: StageMode | str | None = None,
) -> Debate:
    article = get_article(session, article_id)
    if article is None:
        raise ValueError(f"Article {article_id} not found")

    debate_depth, output_style, stage_mode = _resolve_debate_config(
        article,
        debate_depth=debate_depth,
        output_style=output_style,
        stage_mode=stage_mode,
    )
    debate = Debate(
        article_id=article_id,
        status=DebateStatus.PENDING,
        debate_depth=debate_depth,
        output_style=output_style,
        stage_mode=stage_mode,
    )
    session.add(debate)
    session.commit()
    session.refresh(debate)
    return debate


def create_topic_debate(
    session: Session,
    *,
    topic: str,
    background: str | None = None,
    user_question: str | None = None,
    debate_depth: DebateDepth | str = DebateDepth.STANDARD,
    output_style: OutputStyle | str | None = OutputStyle.CONCISE,
    stage_mode: StageMode | str | None = StageMode.TOPIC_5,
) -> Debate:
    content = background or topic
    article = Article(
        title=topic,
        source="topic",
        content=content,
        user_question=user_question,
    )
    session.add(article)
    session.commit()
    session.refresh(article)
    return create_debate(
        session,
        article.id,
        debate_depth=debate_depth,
        output_style=output_style,
        stage_mode=stage_mode,
    )


async def create_and_run_debate(
    session: Session,
    article_id: int,
    *,
    orchestrator: DebateOrchestrator | None = None,
) -> Debate:
    debate = create_debate(session, article_id)
    return await run_debate(session, debate.id, orchestrator=orchestrator)


async def run_debate_background(
    debate_id: int,
    *,
    orchestrator: DebateOrchestrator | None = None,
) -> None:
    with Session(engine) as session:
        await run_debate(session, debate_id, orchestrator=orchestrator)


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

    article_payload = _article_payload(article, debate)
    runner = orchestrator or DebateOrchestrator()
    results: list[DebateStageResult] = []
    try:
        if hasattr(runner, "run_iter"):
            async for result in runner.run_iter(article_payload):
                _save_stage_result(session, debate, result)
                results.append(result)
        else:
            results = await runner.run(article_payload)
            _save_stage_results(session, debate, results)
        _apply_success_fields(debate, results)
        debate.status = DebateStatus.COMPLETED
    except OrchestrationError as exc:
        if not results:
            results = _save_missing_stage_results(session, debate, exc.completed_results)
        _apply_partial_fields(debate, results)
        debate.status = DebateStatus.FAILED
        debate.error_message = str(exc)
    except Exception as exc:
        _apply_partial_fields(debate, results)
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


def rerun_debate(session: Session, debate_id: int) -> Debate | None:
    debate = session.get(Debate, debate_id)
    if debate is None:
        return None

    if debate.status != DebateStatus.FAILED:
        raise ValueError("Only failed debates can be rerun")

    messages = session.exec(
        select(AgentMessage).where(AgentMessage.debate_id == debate_id)
    ).all()
    for message in messages:
        session.delete(message)

    debate.status = DebateStatus.PENDING
    debate.main_claim = None
    debate.debate_topic = None
    debate.final_report = None
    debate.winner = None
    debate.credibility_score = None
    debate.error_message = None
    debate.updated_at = datetime.now(UTC)
    session.add(debate)
    session.commit()
    session.refresh(debate)
    return debate


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


def _save_stage_result(
    session: Session,
    debate: Debate,
    result: DebateStageResult,
) -> AgentMessage:
    message = AgentMessage(debate_id=debate.id, **result.to_message_dict())
    session.add(message)
    session.commit()
    session.refresh(message)
    return message


def _save_missing_stage_results(
    session: Session,
    debate: Debate,
    results: list[DebateStageResult],
) -> list[DebateStageResult]:
    existing_stages = {
        message.stage
        for message in session.exec(
            select(AgentMessage).where(AgentMessage.debate_id == debate.id)
        ).all()
    }
    missing_results = [result for result in results if result.stage not in existing_stages]
    if missing_results:
        _save_stage_results(session, debate, missing_results)
    return results


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


def _article_payload(article: Article, debate: Debate | None = None) -> dict[str, Any]:
    payload = {
        "id": article.id,
        "title": article.title,
        "source": article.source,
        "content": article.content,
        "user_question": article.user_question,
        "created_at": article.created_at.isoformat(),
    }
    if debate is not None:
        payload.update(
            {
                "debate_depth": debate.debate_depth.value,
                "output_style": debate.output_style.value,
                "stage_mode": debate.stage_mode.value,
            }
        )
    if article.source == "topic":
        payload.update(
            {
                "debate_mode": "topic",
                "topic": article.title,
                "background": article.content,
            }
        )
    else:
        payload["debate_mode"] = "article"
    return payload


def _resolve_debate_config(
    article: Article,
    *,
    debate_depth: DebateDepth | str,
    output_style: OutputStyle | str | None,
    stage_mode: StageMode | str | None,
) -> tuple[DebateDepth, OutputStyle, StageMode]:
    depth = DebateDepth(debate_depth)
    is_topic = article.source == "topic"
    default_style = OutputStyle.CONCISE if is_topic else OutputStyle.DETAILED
    default_stage_mode = StageMode.TOPIC_5 if is_topic else StageMode.ARTICLE_9
    style = OutputStyle(output_style) if output_style is not None else default_style
    mode = StageMode(stage_mode) if stage_mode is not None else default_stage_mode

    if is_topic and mode == StageMode.ARTICLE_9:
        raise ValueError("Topic debates only support topic_3 or topic_5 stage modes")
    if not is_topic and mode != StageMode.ARTICLE_9:
        raise ValueError("Article debates only support article_9 stage mode")
    return depth, style, mode


def _as_optional_str(value: Any) -> str | None:
    if value is None:
        return None
    return str(value)


def _as_optional_int(value: Any) -> int | None:
    if value is None:
        return None
    return int(value)
