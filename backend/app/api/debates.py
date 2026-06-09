from inspect import isawaitable
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, desc, select

from app.db import get_session
from app.models import AgentMessage, Article, Debate
from app.schemas import (
    AgentMessageRead,
    DebateCreate,
    DebateDetailRead,
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


async def _run_debate_service(service: Any, session: Session, article_id: int) -> Debate:
    if hasattr(service, "create_and_run_debate"):
        result = service.create_and_run_debate(session=session, article_id=article_id)
    elif hasattr(service, "create_debate"):
        result = service.create_debate(session=session, article_id=article_id)
    elif hasattr(service, "run_debate"):
        debate = Debate(article_id=article_id)
        session.add(debate)
        session.commit()
        session.refresh(debate)
        result = service.run_debate(session=session, debate_id=debate.id)
    else:
        raise RuntimeError(
            "Debate service must expose create_and_run_debate, create_debate, or run_debate."
        )
    if isawaitable(result):
        result = await result
    return result


@router.post("", response_model=DebateRead, status_code=status.HTTP_201_CREATED)
async def create_debate(
    payload: DebateCreate,
    session: Annotated[Session, Depends(get_session)],
    service: Annotated[Any, Depends(get_debate_service)],
) -> DebateRead:
    article = session.get(Article, payload.article_id)
    if article is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found",
        )

    debate = await _run_debate_service(service, session, payload.article_id)
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
