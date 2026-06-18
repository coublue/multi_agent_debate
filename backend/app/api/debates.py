from inspect import isawaitable
from typing import Annotated, Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlmodel import Session, desc, select

from app.db import get_session
from app.models import AgentMessage, Article, Debate, DebateStatus
from app.schemas import (
    AgentMessageRead,
    DebateCreate,
    DebateDetailRead,
    DebateFollowUpCreate,
    DebateListItem,
    DebateRead,
)


router = APIRouter(prefix="/api/debates", tags=["debates"])


def get_debate_service() -> Any:
    from app.services import debate_service

    return debate_service


def _debate_read(debate: Debate) -> DebateRead:
    return DebateRead(
        id=debate.id,
        article_id=debate.article_id,
        parent_debate_id=debate.parent_debate_id,
        follow_up_question=debate.follow_up_question,
        status=debate.status,
        main_claim=debate.main_claim,
        debate_topic=debate.debate_topic,
        debate_depth=debate.debate_depth,
        output_style=debate.output_style,
        stage_mode=debate.stage_mode,
        final_report=debate.final_report,
        winner=debate.winner,
        credibility_score=debate.credibility_score,
        error_message=debate.error_message,
        created_at=debate.created_at,
        updated_at=debate.updated_at,
    )


async def _create_debate_service(
    service: Any,
    session: Session,
    payload: DebateCreate,
) -> Debate:
    if hasattr(service, "create_debate"):
        result = service.create_debate(
            session=session,
            article_id=payload.article_id,
            debate_depth=payload.debate_depth,
            output_style=payload.output_style,
            stage_mode=payload.stage_mode,
        )
    else:
        raise RuntimeError("Debate service must expose create_debate.")
    if isawaitable(result):
        result = await result
    return result


async def _run_debate_background_task(service: Any, debate_id: int) -> None:
    if hasattr(service, "run_debate_background"):
        result = service.run_debate_background(debate_id=debate_id)
    else:
        raise RuntimeError("Debate service must expose run_debate_background.")
    if isawaitable(result):
        await result


async def _create_follow_up_service(
    service: Any,
    session: Session,
    parent_debate_id: int,
    payload: DebateFollowUpCreate,
) -> Debate:
    create_func = getattr(service, "create_follow_up_debate", None)
    if not callable(create_func):
        raise RuntimeError("Debate service must expose create_follow_up_debate.")
    result = create_func(
        session=session,
        parent_debate_id=parent_debate_id,
        question=payload.question,
        debate_depth=payload.debate_depth,
        output_style=payload.output_style,
        stage_mode=payload.stage_mode,
    )
    if isawaitable(result):
        result = await result
    return result


async def _rerun_debate_service(
    service: Any,
    session: Session,
    debate_id: int,
) -> Debate | None:
    if hasattr(service, "rerun_debate"):
        result = service.rerun_debate(session=session, debate_id=debate_id)
    else:
        raise RuntimeError("Debate service must expose rerun_debate.")
    if isawaitable(result):
        result = await result
    return result


@router.post("", response_model=DebateRead, status_code=status.HTTP_201_CREATED)
async def create_debate(
    payload: DebateCreate,
    background_tasks: BackgroundTasks,
    session: Annotated[Session, Depends(get_session)],
    service: Annotated[Any, Depends(get_debate_service)],
) -> DebateRead:
    article = session.get(Article, payload.article_id)
    if article is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found",
        )

    try:
        debate = await _create_debate_service(service, session, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    background_tasks.add_task(_run_debate_background_task, service, debate.id)
    return _debate_read(debate)


@router.get("", response_model=list[DebateListItem])
def list_debates(
    session: Annotated[Session, Depends(get_session)],
) -> list[DebateListItem]:
    rows = session.exec(
        select(Debate, Article)
        .join(Article, Debate.article_id == Article.id)
        .order_by(desc(Debate.created_at))
    ).all()

    return [
        DebateListItem(
            id=debate.id,
            article_id=debate.article_id,
            title=article.title,
            status=debate.status,
            debate_depth=debate.debate_depth,
            output_style=debate.output_style,
            stage_mode=debate.stage_mode,
            winner=debate.winner,
            credibility_score=debate.credibility_score,
            created_at=debate.created_at,
        )
        for debate, article in rows
    ]


@router.get("/{debate_id}", response_model=DebateDetailRead)
def get_debate(
    debate_id: int,
    session: Annotated[Session, Depends(get_session)],
) -> DebateDetailRead:
    debate = session.get(Debate, debate_id)
    if debate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Debate not found",
        )

    article = session.get(Article, debate.article_id)
    if article is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Debate article not found",
        )

    messages = session.exec(
        select(AgentMessage)
        .where(AgentMessage.debate_id == debate_id)
        .order_by(AgentMessage.round_index, AgentMessage.created_at)
    ).all()

    debate_data = _debate_read(debate).model_dump()
    debate_data["article"] = article.model_dump()
    debate_data["messages"] = [AgentMessageRead(**message.model_dump()) for message in messages]
    return DebateDetailRead(**debate_data)


@router.post(
    "/{debate_id}/follow-ups",
    response_model=DebateRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_follow_up_debate(
    debate_id: int,
    payload: DebateFollowUpCreate,
    background_tasks: BackgroundTasks,
    session: Annotated[Session, Depends(get_session)],
    service: Annotated[Any, Depends(get_debate_service)],
) -> DebateRead:
    parent = session.get(Debate, debate_id)
    if parent is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Debate not found",
        )
    if parent.status != DebateStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only completed debates can be followed up",
        )

    existing = session.exec(
        select(Debate).where(
            Debate.parent_debate_id == debate_id,
            Debate.follow_up_question == payload.question,
            Debate.debate_depth == (payload.debate_depth or parent.debate_depth),
            Debate.output_style == (payload.output_style or parent.output_style),
            Debate.stage_mode == (payload.stage_mode or parent.stage_mode),
            Debate.status.in_([DebateStatus.PENDING, DebateStatus.RUNNING]),
        )
    ).first()
    if existing is not None:
        return _debate_read(existing)

    try:
        debate = await _create_follow_up_service(service, session, debate_id, payload)
    except ValueError as exc:
        detail = str(exc)
        code = (
            status.HTTP_409_CONFLICT
            if detail == "Only completed debates can be followed up"
            else status.HTTP_400_BAD_REQUEST
        )
        raise HTTPException(status_code=code, detail=detail) from exc

    background_tasks.add_task(_run_debate_background_task, service, debate.id)
    return _debate_read(debate)


@router.post("/{debate_id}/rerun", response_model=DebateRead)
async def rerun_debate(
    debate_id: int,
    background_tasks: BackgroundTasks,
    session: Annotated[Session, Depends(get_session)],
    service: Annotated[Any, Depends(get_debate_service)],
) -> DebateRead:
    try:
        debate = await _rerun_debate_service(service, session, debate_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    if debate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Debate not found",
        )

    background_tasks.add_task(_run_debate_background_task, service, debate.id)
    return _debate_read(debate)


@router.delete("/{debate_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_debate(
    debate_id: int,
    session: Annotated[Session, Depends(get_session)],
    service: Annotated[Any, Depends(get_debate_service)],
) -> None:
    delete_func = getattr(service, "delete_debate", None)
    deleted = delete_func(session=session, debate_id=debate_id) if callable(delete_func) else False
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Debate not found",
        )
