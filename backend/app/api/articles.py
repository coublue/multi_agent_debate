from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.db import get_session
from app.models import Article
from app.schemas import ArticleCreate, ArticleListItem, ArticleRead, DebateListItem
from app.services import article_service


router = APIRouter(prefix="/api/articles", tags=["articles"])


def _article_read(article: Article) -> ArticleRead:
    return ArticleRead(**article.model_dump())


@router.post("", response_model=ArticleRead, status_code=status.HTTP_201_CREATED)
def create_article(
    payload: ArticleCreate,
    session: Annotated[Session, Depends(get_session)],
) -> ArticleRead:
    article = article_service.create_article(session, payload)
    return _article_read(article)


@router.get("", response_model=list[ArticleListItem])
def list_articles(
    session: Annotated[Session, Depends(get_session)],
) -> list[ArticleListItem]:
    summaries = article_service.list_article_summaries(session)
    return [
        ArticleListItem(
            **summary.article.model_dump(),
            debate_count=summary.debate_count,
            latest_debate_id=summary.latest_debate_id,
            latest_debate_status=summary.latest_debate_status,
            latest_debate_winner=summary.latest_debate_winner,
            latest_debate_credibility_score=summary.latest_debate_credibility_score,
            latest_debate_created_at=summary.latest_debate_created_at,
        )
        for summary in summaries
    ]


@router.get("/{article_id}/debates", response_model=list[DebateListItem])
def list_article_debates(
    article_id: int,
    session: Annotated[Session, Depends(get_session)],
) -> list[DebateListItem]:
    article = article_service.get_article(session, article_id)
    if article is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found",
        )

    debates = article_service.list_debates_for_article(session, article_id)
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
        for debate in debates
    ]


@router.get("/{article_id}", response_model=ArticleRead)
def get_article(
    article_id: int,
    session: Annotated[Session, Depends(get_session)],
) -> ArticleRead:
    article = article_service.get_article(session, article_id)
    if article is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found",
        )
    return _article_read(article)


@router.delete("/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_article(
    article_id: int,
    session: Annotated[Session, Depends(get_session)],
) -> None:
    deleted = article_service.delete_article(session, article_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found",
        )
