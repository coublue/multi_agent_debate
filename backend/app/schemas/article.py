from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ArticleCreate(BaseModel):
    title: str
    source: Optional[str] = None
    content: str
    user_question: Optional[str] = None


class ArticleRead(BaseModel):
    id: int
    title: str
    source: Optional[str] = None
    content: str
    user_question: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ArticleListItem(BaseModel):
    id: int
    title: str
    source: Optional[str] = None
    created_at: datetime
