from typing import Literal

from pydantic import BaseModel, Field


class AgentTextOutput(BaseModel):
    summary: str
    key_points: list[str] = Field(default_factory=list)
    evidence: list[str] = Field(default_factory=list)
    rebuttals: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)


class ModeratorOpening(BaseModel):
    main_claim: str
    debate_topic: str
    key_points: list[str] = Field(default_factory=list)
    controversial_points: list[str] = Field(default_factory=list)
    rules: list[str] = Field(default_factory=list)


class ModeratorMidpoint(BaseModel):
    pro_summary: str
    con_summary: str
    key_disagreements: list[str] = Field(default_factory=list)
    unresolved_questions: list[str] = Field(default_factory=list)
    focus_for_closing: str


class JudgeReport(BaseModel):
    main_claim: str
    pro_strongest_points: list[str] = Field(default_factory=list)
    con_strongest_points: list[str] = Field(default_factory=list)
    key_disagreements: list[str] = Field(default_factory=list)
    winner: Literal["pro", "con", "mixed"]
    credibility_score: int = Field(ge=0, le=100)
    credible_parts: list[str] = Field(default_factory=list)
    questionable_parts: list[str] = Field(default_factory=list)
    follow_up_questions: list[str] = Field(default_factory=list)
    final_summary: str
