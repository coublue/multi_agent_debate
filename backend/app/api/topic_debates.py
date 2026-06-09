from inspect import isawaitable
from typing import Annotated, Any

from fastapi import APIRouter, BackgroundTasks, Depends, status
from sqlmodel import Session

from app.api.debates import get_debate_service
from app.db import get_session
from app.models import Debate
from app.schemas import DebateRead, TopicDebateCreate


router = APIRouter(prefix="/api/topic-debates", tags=["topic-debates"])


def _debate_read(debate: Debate) -> DebateRead:
    return DebateRead(
        id=debate.id,
        article_id=debate.article_id,
        status=debate.status,
        main_claim=debate.main_claim,
        debate_topic=debate.debate_topic,
        final_report=debate.final_report,
        winner=debate.winner,
        credibility_score=debate.credibility_score,
        error_message=debate.error_message,
        created_at=debate.created_at,
        updated_at=debate.updated_at,
    )


async def _create_topic_debate_service(
    service: Any,
    session: Session,
    payload: TopicDebateCreate,
) -> Debate:
    if hasattr(service, "create_topic_debate"):
        result = service.create_topic_debate(
            session=session,
            topic=payload.topic,
            background=payload.background,
            user_question=payload.user_question,
        )
    else:
        raise RuntimeError("Debate service must expose create_topic_debate.")
    if isawaitable(result):
        result = await result
    return result


async def _run_topic_debate_background_task(service: Any, debate_id: int) -> None:
    if hasattr(service, "run_topic_debate_background"):
        result = service.run_topic_debate_background(debate_id=debate_id)
    elif hasattr(service, "run_debate_background"):
        result = service.run_debate_background(debate_id=debate_id)
    else:
        raise RuntimeError(
            "Debate service must expose run_topic_debate_background or "
            "run_debate_background."
        )
    if isawaitable(result):
        await result


@router.post("", response_model=DebateRead, status_code=status.HTTP_201_CREATED)
async def create_topic_debate(
    payload: TopicDebateCreate,
    background_tasks: BackgroundTasks,
    session: Annotated[Session, Depends(get_session)],
    service: Annotated[Any, Depends(get_debate_service)],
) -> DebateRead:
    debate = await _create_topic_debate_service(service, session, payload)
    background_tasks.add_task(_run_topic_debate_background_task, service, debate.id)
    return _debate_read(debate)
