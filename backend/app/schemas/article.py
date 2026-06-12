from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.debate import DebateStatus


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
    user_question: Optional[str] = None
    created_at: datetime
    debate_count: int = 0
    latest_debate_id: Optional[int] = None
    latest_debate_status: Optional[DebateStatus] = None
    latest_debate_winner: Optional[str] = None
    latest_debate_credibility_score: Optional[int] = None
    latest_debate_created_at: Optional[datetime] = None
