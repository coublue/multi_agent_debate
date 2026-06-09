import pytest
from pydantic import ValidationError

from app.models.debate import DebateStage, DebateStatus
from app.schemas.agent_outputs import JudgeReport
from app.schemas.debate import AgentMessageRead, DebateRead


def _judge_report_data(**overrides):
    data = {
        "main_claim": "The article's main claim",
        "pro_strongest_points": ["The argument uses relevant examples."],
        "con_strongest_points": ["The evidence is incomplete."],
        "key_disagreements": ["Whether the examples justify the conclusion."],
        "winner": "mixed",
        "credibility_score": 72,
        "credible_parts": ["The narrow descriptive claim is plausible."],
        "questionable_parts": ["The broad causal claim needs more evidence."],
        "follow_up_questions": ["What primary sources support the claim?"],
        "final_summary": "Read as a plausible but not settled argument.",
    }
    data.update(overrides)
    return data


def test_judge_report_accepts_supported_winners():
    for winner in ("pro", "con", "mixed"):
        report = JudgeReport(**_judge_report_data(winner=winner))
        assert report.winner == winner


def test_judge_report_rejects_unknown_winner():
    with pytest.raises(ValidationError):
        JudgeReport(**_judge_report_data(winner="draw"))


@pytest.mark.parametrize("score", [0, 50, 100])
def test_judge_report_accepts_credibility_score_range(score):
    report = JudgeReport(**_judge_report_data(credibility_score=score))
    assert report.credibility_score == score


@pytest.mark.parametrize("score", [-1, 101])
def test_judge_report_rejects_credibility_score_out_of_range(score):
    with pytest.raises(ValidationError):
        JudgeReport(**_judge_report_data(credibility_score=score))


def test_status_contract_values_are_fixed():
    assert {status.value for status in DebateStatus} == {
        "pending",
        "running",
        "completed",
        "failed",
    }


def test_stage_contract_values_are_fixed():
    assert [stage.value for stage in DebateStage] == [
        "moderator_opening",
        "pro_opening",
        "con_opening",
        "pro_rebuttal",
        "con_rebuttal",
        "moderator_midpoint",
        "pro_closing",
        "con_closing",
        "judge_report",
    ]


def test_debate_read_validates_status_and_final_report():
    debate = DebateRead(
        id=1,
        article_id=1,
        status="completed",
        main_claim="The article's main claim",
        debate_topic="Whether the claim is well supported",
        final_report=_judge_report_data(),
        winner="mixed",
        credibility_score=72,
        error_message=None,
        created_at="2026-06-07T10:00:00",
        updated_at="2026-06-07T10:05:00",
    )

    assert debate.status == DebateStatus.COMPLETED
    assert debate.final_report is not None
    assert debate.final_report.winner == "mixed"


def test_debate_read_rejects_invalid_status():
    with pytest.raises(ValidationError):
        DebateRead(
            id=1,
            article_id=1,
            status="done",
            created_at="2026-06-07T10:00:00",
            updated_at="2026-06-07T10:05:00",
        )


def test_agent_message_read_validates_stage():
    message = AgentMessageRead(
        id=1,
        debate_id=1,
        agent_name="Moderator Agent",
        agent_role="moderator",
        round_index=1,
        stage="moderator_opening",
        message_type="structured",
        content={"main_claim": "A claim"},
        target_agent=None,
        created_at="2026-06-07T10:00:00",
    )

    assert message.stage == DebateStage.MODERATOR_OPENING


def test_agent_message_read_rejects_invalid_stage():
    with pytest.raises(ValidationError):
        AgentMessageRead(
            id=1,
            debate_id=1,
            agent_name="Moderator Agent",
            agent_role="moderator",
            round_index=1,
            stage="opening",
            message_type="structured",
            content={"main_claim": "A claim"},
            target_agent=None,
            created_at="2026-06-07T10:00:00",
        )
