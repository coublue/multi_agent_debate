from datetime import UTC, datetime
from enum import Enum
from typing import Optional

from sqlalchemy import Column, JSON
from sqlmodel import Field, SQLModel


class DebateStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class DebateStage(str, Enum):
    MODERATOR_OPENING = "moderator_opening"
    PRO_OPENING = "pro_opening"
    CON_OPENING = "con_opening"
    PRO_REBUTTAL = "pro_rebuttal"
    CON_REBUTTAL = "con_rebuttal"
    MODERATOR_MIDPOINT = "moderator_midpoint"
    PRO_CLOSING = "pro_closing"
    CON_CLOSING = "con_closing"
    JUDGE_REPORT = "judge_report"


class Debate(SQLModel, table=True):
    __tablename__ = "debates"

    id: Optional[int] = Field(default=None, primary_key=True)
    article_id: int = Field(index=True, foreign_key="articles.id")
    status: DebateStatus = Field(default=DebateStatus.PENDING, index=True)
    main_claim: Optional[str] = None
    debate_topic: Optional[str] = None
    final_report: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    winner: Optional[str] = Field(default=None, index=True)
    credibility_score: Optional[int] = Field(default=None, ge=0, le=100)
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC), index=True)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
