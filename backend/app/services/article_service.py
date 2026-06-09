from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from sqlmodel import Session, select

from app.models.agent_message import AgentMessage
from app.models.article import Article
from app.models.debate import Debate, DebateStatus
from app.schemas.article import ArticleCreate


@dataclass(frozen=True)
class ArticleListSummary:
    article: Article
    debate_count: int
    latest_debate_id: Optional[int] = None
    latest_debate_status: Optional[DebateStatus] = None
    latest_debate_winner: Optional[str] = None
    latest_debate_credibility_score: Optional[int] = None
    latest_debate_created_at: Optional[datetime] = None


def create_article(session: Session, article_in: ArticleCreate) -> Article:
    article = Article(**article_in.model_dump())
    session.add(article)
    session.commit()
    session.refresh(article)
    return article


def get_article(session: Session, article_id: int) -> Article | None:
    return session.get(Article, article_id)


def list_articles(session: Session, *, offset: int = 0, limit: int = 50) -> list[Article]:
    statement = (
        select(Article)
        .order_by(Article.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    return list(session.exec(statement).all())


def list_article_summaries(
    session: Session,
    *,
    offset: int = 0,
    limit: int = 50,
) -> list[ArticleListSummary]:
    articles = list_articles(session, offset=offset, limit=limit)
    summaries: list[ArticleListSummary] = []
    for article in articles:
        if article.id is None:
            summaries.append(ArticleListSummary(article=article, debate_count=0))
            continue

        debates = list_debates_for_article(session, article.id)
        latest = debates[0] if debates else None
        summaries.append(
            ArticleListSummary(
                article=article,
                debate_count=len(debates),
                latest_debate_id=latest.id if latest else None,
                latest_debate_status=latest.status if latest else None,
                latest_debate_winner=latest.winner if latest else None,
                latest_debate_credibility_score=latest.credibility_score if latest else None,
                latest_debate_created_at=latest.created_at if latest else None,
            )
        )
    return summaries


def list_debates_for_article(session: Session, article_id: int) -> list[Debate]:
    statement = (
        select(Debate)
        .where(Debate.article_id == article_id)
        .order_by(Debate.created_at.desc())
    )
    return list(session.exec(statement).all())


def delete_article(session: Session, article_id: int) -> bool:
    article = session.get(Article, article_id)
    if article is None:
        return False

    debates = list_debates_for_article(session, article_id)
    for debate in debates:
        if debate.id is None:
            continue
        messages = session.exec(
            select(AgentMessage).where(AgentMessage.debate_id == debate.id)
        ).all()
        for message in messages:
            session.delete(message)
        session.delete(debate)

    session.delete(article)
    session.commit()
    return True
