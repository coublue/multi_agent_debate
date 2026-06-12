from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class AgentOutputBase(BaseModel):
    model_config = ConfigDict(extra="allow")

    summary: str = ""
    key_points: list[str] = Field(default_factory=list)
    content: str = ""


class AgentTextOutput(AgentOutputBase):
    key_points: list[str] = Field(default_factory=list)
    evidence: list[str] = Field(default_factory=list)
    rebuttals: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)


class SideAgentOutput(AgentOutputBase):
    strongest_claim: str = ""
    supporting_reasons: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    evidence_assessment: str | None = None


class DisagreementItem(BaseModel):
    model_config = ConfigDict(extra="allow")

    issue: str = ""
    pro_position: str = ""
    con_position: str = ""


class ModeratorOpening(AgentOutputBase):
    main_claim: str = ""
    debate_topic: str = ""
    debate_focus: str = ""
    key_points: list[str] = Field(default_factory=list)
    controversial_points: list[str] = Field(default_factory=list)
    rules: list[str] = Field(default_factory=list)
    disagreement_map: list[DisagreementItem] = Field(default_factory=list)


class ModeratorMidpoint(AgentOutputBase):
    pro_summary: str = ""
    con_summary: str = ""
    debate_focus: str = ""
    key_disagreements: list[str] = Field(default_factory=list)
    unresolved_questions: list[str] = Field(default_factory=list)
    focus_for_closing: str = ""
    disagreement_map: list[DisagreementItem] = Field(default_factory=list)


class JudgeReport(AgentOutputBase):
    main_claim: str = ""
    verdict: str = ""
    decision_basis: list[str] = Field(default_factory=list)
    pro_strongest_points: list[str] = Field(default_factory=list)
    con_strongest_points: list[str] = Field(default_factory=list)
    key_disagreements: list[str] = Field(default_factory=list)
    winner: Literal["pro", "con", "balanced", "mixed"] | None = None
    credibility_score: int | None = Field(default=None, ge=0, le=100)
    credible_parts: list[str] = Field(default_factory=list)
    questionable_parts: list[str] = Field(default_factory=list)
    final_summary: str = ""
