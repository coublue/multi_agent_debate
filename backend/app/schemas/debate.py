from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.debate import DebateStage, DebateStatus
from app.schemas.agent_outputs import JudgeReport
from app.schemas.article import ArticleRead


class DebateCreate(BaseModel):
    article_id: int


class AgentMessageRead(BaseModel):
    id: int
    debate_id: int
    agent_name: str
    agent_role: str
    round_index: int
    stage: DebateStage
    message_type: str
    content: dict
    target_agent: Optional[str] = None
    created_at: datetime


class DebateRead(BaseModel):
    id: int
    article_id: int
    status: DebateStatus
    main_claim: Optional[str] = None
    debate_topic: Optional[str] = None
    final_report: Optional[JudgeReport] = None
    winner: Optional[str] = None
    credibility_score: Optional[int] = Field(default=None, ge=0, le=100)
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class DebateDetailRead(DebateRead):
    article: ArticleRead
    messages: list[AgentMessageRead] = Field(default_factory=list)


class DebateListItem(BaseModel):
    id: int
    article_id: int
    title: str
    status: DebateStatus
    winner: Optional[str] = None
    credibility_score: Optional[int] = Field(default=None, ge=0, le=100)
    created_at: datetime
