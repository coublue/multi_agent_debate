from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.models.debate import (
    DebateDepth,
    DebateStage,
    DebateStatus,
    OutputStyle,
    StageMode,
)
from app.schemas.agent_outputs import JudgeReport
from app.schemas.article import ArticleRead


class DebateCreate(BaseModel):
    article_id: int
    debate_depth: DebateDepth = DebateDepth.STANDARD
    output_style: Optional[OutputStyle] = None
    stage_mode: Optional[StageMode] = None


class TopicDebateCreate(BaseModel):
    topic: str = Field(min_length=1)
    background: Optional[str] = None
    user_question: Optional[str] = None
    debate_depth: DebateDepth = DebateDepth.STANDARD
    output_style: OutputStyle = OutputStyle.CONCISE
    stage_mode: StageMode = StageMode.TOPIC_5

    @field_validator("topic")
    @classmethod
    def topic_must_not_be_blank(cls, value: str) -> str:
        topic = value.strip()
        if not topic:
            raise ValueError("Topic must not be blank")
        return topic

    @field_validator("background", "user_question")
    @classmethod
    def blank_optional_fields_become_none(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

    @field_validator("stage_mode")
    @classmethod
    def stage_mode_must_be_topic_mode(cls, value: StageMode) -> StageMode:
        if value not in {StageMode.TOPIC_3, StageMode.TOPIC_5}:
            raise ValueError("Topic debates only support topic_3 or topic_5 stage modes")
        return value


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
    debate_depth: DebateDepth = DebateDepth.STANDARD
    output_style: OutputStyle = OutputStyle.DETAILED
    stage_mode: StageMode = StageMode.ARTICLE_9
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
    debate_depth: DebateDepth = DebateDepth.STANDARD
    output_style: OutputStyle = OutputStyle.DETAILED
    stage_mode: StageMode = StageMode.ARTICLE_9
    winner: Optional[str] = None
    credibility_score: Optional[int] = Field(default=None, ge=0, le=100)
    created_at: datetime
