from datetime import UTC, datetime
from enum import Enum
from typing import Optional

from sqlalchemy import Column, Enum as SAEnum, ForeignKey, Integer, JSON
from sqlmodel import Field, SQLModel


class DebateStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class DebateDepth(str, Enum):
    QUICK = "quick"
    STANDARD = "standard"
    DEEP = "deep"


class OutputStyle(str, Enum):
    CONCISE = "concise"
    DETAILED = "detailed"


class StageMode(str, Enum):
    ARTICLE_9 = "article_9"
    TOPIC_5 = "topic_5"
    TOPIC_3 = "topic_3"


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


def enum_value_column(enum_type: type[Enum], **kwargs: object) -> Column:
    return Column(
        SAEnum(
            enum_type,
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        ),
        **kwargs,
    )


class Debate(SQLModel, table=True):
    __tablename__ = "debates"

    id: Optional[int] = Field(default=None, primary_key=True)
    article_id: int = Field(index=True, foreign_key="articles.id")
    parent_debate_id: Optional[int] = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("debates.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )
    follow_up_question: Optional[str] = None
    parent_context_snapshot: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    status: DebateStatus = Field(
        default=DebateStatus.PENDING,
        sa_column=enum_value_column(DebateStatus, nullable=False, index=True),
    )
    main_claim: Optional[str] = None
    debate_topic: Optional[str] = None
    debate_depth: DebateDepth = Field(
        default=DebateDepth.STANDARD,
        sa_column=enum_value_column(DebateDepth, nullable=False, index=True),
    )
    output_style: OutputStyle = Field(
        default=OutputStyle.DETAILED,
        sa_column=enum_value_column(OutputStyle, nullable=False, index=True),
    )
    stage_mode: StageMode = Field(
        default=StageMode.ARTICLE_9,
        sa_column=enum_value_column(StageMode, nullable=False, index=True),
    )
    final_report: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    winner: Optional[str] = Field(default=None, index=True)
    credibility_score: Optional[int] = Field(default=None, ge=0, le=100)
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC), index=True)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
