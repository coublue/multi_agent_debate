from __future__ import annotations

from sqlmodel import Session, select

from app.models.article import Article
from app.schemas.article import ArticleCreate


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

