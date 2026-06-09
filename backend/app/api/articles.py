from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, desc, select

from app.db import get_session
from app.models import Article
from app.schemas import ArticleCreate, ArticleListItem, ArticleRead


router = APIRouter(prefix="/api/articles", tags=["articles"])


def _article_read(article: Article) -> ArticleRead:
    return ArticleRead(**article.model_dump())


@router.post("", response_model=ArticleRead, status_code=status.HTTP_201_CREATED)
def create_article(
    payload: ArticleCreate,
    session: Annotated[Session, Depends(get_session)],
) -> ArticleRead:
    article = Article(**payload.model_dump())
    session.add(article)
    session.commit()
    session.refresh(article)
    return _article_read(article)


@router.get("", response_model=list[ArticleListItem])
def list_articles(
    session: Annotated[Session, Depends(get_session)],
) -> list[ArticleListItem]:
    articles = session.exec(select(Article).order_by(desc(Article.created_at))).all()
    return [ArticleListItem(**article.model_dump()) for article in articles]


@router.get("/{article_id}", response_model=ArticleRead)
def get_article(
    article_id: int,
    session: Annotated[Session, Depends(get_session)],
) -> ArticleRead:
    article = session.get(Article, article_id)
    if article is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found",
        )
    return _article_read(article)
