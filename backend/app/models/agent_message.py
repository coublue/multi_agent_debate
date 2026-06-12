from datetime import UTC, datetime
from typing import Optional

from sqlalchemy import Column, JSON
from sqlmodel import Field, SQLModel

from app.models.debate import DebateStage, enum_value_column


class AgentMessage(SQLModel, table=True):
    __tablename__ = "agent_messages"

    id: Optional[int] = Field(default=None, primary_key=True)
    debate_id: int = Field(index=True, foreign_key="debates.id")
    agent_name: str = Field(index=True)
    agent_role: str = Field(index=True)
    round_index: int = Field(default=0, ge=0)
    stage: DebateStage = Field(
        sa_column=enum_value_column(DebateStage, nullable=False, index=True),
    )
    message_type: str = Field(default="text", index=True)
    content: dict = Field(sa_column=Column(JSON))
    target_agent: Optional[str] = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC), index=True)
