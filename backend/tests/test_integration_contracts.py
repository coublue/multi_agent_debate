from pathlib import Path

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import app
from app.models.debate import DebateStage, DebateStatus
from app.schemas.agent_outputs import (
    AgentTextOutput,
    DisagreementItem,
    JudgeReport,
    ModeratorMidpoint,
    ModeratorOpening,
    SideAgentOutput,
)
from app.schemas.article import ArticleCreate, ArticleListItem, ArticleRead
from app.schemas.debate import AgentMessageRead, DebateCreate, DebateDetailRead, DebateListItem, DebateRead


EXPECTED_STATUS_VALUES = ["pending", "running", "completed", "failed"]
EXPECTED_STAGE_VALUES = [
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


def _schema_properties(model: type) -> set[str]:
    return set(model.model_json_schema().get("properties", {}))


def test_debate_status_and_stage_contracts_are_stable() -> None:
    assert [status.value for status in DebateStatus] == EXPECTED_STATUS_VALUES
    assert [stage.value for stage in DebateStage] == EXPECTED_STAGE_VALUES


def test_prompt_files_exist_for_every_debate_stage() -> None:
    prompts_dir = Path(__file__).resolve().parents[1] / "app" / "prompts"
    prompt_files = {
        "moderator_opening": "moderator_opening.txt",
        "pro_opening": "pro_opening.txt",
        "con_opening": "con_opening.txt",
        "pro_rebuttal": "pro_rebuttal.txt",
        "con_rebuttal": "con_rebuttal.txt",
        "moderator_midpoint": "moderator_midpoint.txt",
        "pro_closing": "pro_closing.txt",
        "con_closing": "con_closing.txt",
        "judge_report": "judge.txt",
    }

    missing = [
        prompt_files[stage]
        for stage in EXPECTED_STAGE_VALUES
        if not (prompts_dir / prompt_files[stage]).is_file()
    ]

    assert missing == []


def test_deepseek_defaults_do_not_require_network_or_env(monkeypatch) -> None:
    for env_name in (
        "DEEPSEEK_API_KEY",
        "DEEPSEEK_BASE_URL",
        "DEEPSEEK_MODEL",
        "LLM_TIMEOUT_SECONDS",
    ):
        monkeypatch.delenv(env_name, raising=False)

    settings = Settings(_env_file=None)

    assert settings.deepseek_api_key == ""
    assert settings.deepseek_base_url == "https://api.deepseek.com"
    assert settings.deepseek_model == "deepseek-v4-pro"
    assert settings.llm_timeout_seconds == 120.0


def test_article_api_schema_core_fields_are_stable() -> None:
    assert _schema_properties(ArticleCreate) == {"title", "source", "content", "user_question"}
    assert _schema_properties(ArticleRead) == {
        "id",
        "title",
        "source",
        "content",
        "user_question",
        "created_at",
        "updated_at",
    }
    assert _schema_properties(ArticleListItem) == {
        "id",
        "title",
        "source",
        "user_question",
        "created_at",
        "debate_count",
        "latest_debate_id",
        "latest_debate_status",
        "latest_debate_winner",
        "latest_debate_credibility_score",
        "latest_debate_created_at",
    }


def test_debate_api_schema_core_fields_are_stable() -> None:
    assert _schema_properties(DebateCreate) == {
        "article_id",
        "debate_depth",
        "output_style",
        "stage_mode",
    }
    assert _schema_properties(DebateRead) == {
        "id",
        "article_id",
        "parent_debate_id",
        "follow_up_question",
        "status",
        "main_claim",
        "debate_topic",
        "debate_depth",
        "output_style",
        "stage_mode",
        "final_report",
        "winner",
        "credibility_score",
        "error_message",
        "created_at",
        "updated_at",
    }
    assert {"article", "messages"} <= _schema_properties(DebateDetailRead)
    assert _schema_properties(DebateListItem) == {
        "id",
        "article_id",
        "title",
        "status",
        "debate_depth",
        "output_style",
        "stage_mode",
        "winner",
        "credibility_score",
        "created_at",
    }
    assert _schema_properties(AgentMessageRead) == {
        "id",
        "debate_id",
        "agent_name",
        "agent_role",
        "round_index",
        "stage",
        "message_type",
        "content",
        "target_agent",
        "created_at",
    }


def test_agent_output_schema_core_fields_are_stable() -> None:
    assert _schema_properties(AgentTextOutput) == {
        "summary",
        "key_points",
        "content",
        "evidence",
        "rebuttals",
        "limitations",
    }
    assert _schema_properties(SideAgentOutput) == {
        "summary",
        "key_points",
        "content",
        "strongest_claim",
        "supporting_reasons",
        "weaknesses",
        "evidence_assessment",
    }
    assert _schema_properties(DisagreementItem) == {
        "issue",
        "pro_position",
        "con_position",
    }
    assert _schema_properties(ModeratorOpening) == {
        "summary",
        "content",
        "main_claim",
        "debate_topic",
        "debate_focus",
        "key_points",
        "controversial_points",
        "rules",
        "disagreement_map",
    }
    assert _schema_properties(ModeratorMidpoint) == {
        "summary",
        "key_points",
        "content",
        "pro_summary",
        "con_summary",
        "debate_focus",
        "key_disagreements",
        "unresolved_questions",
        "focus_for_closing",
        "disagreement_map",
    }
    assert _schema_properties(JudgeReport) == {
        "summary",
        "key_points",
        "content",
        "main_claim",
        "verdict",
        "decision_basis",
        "pro_strongest_points",
        "con_strongest_points",
        "key_disagreements",
        "winner",
        "credibility_score",
        "credible_parts",
        "questionable_parts",
        "final_summary",
    }


def test_openapi_contract_exposes_health_and_validates_mounted_api_paths() -> None:
    openapi = TestClient(app).get("/openapi.json").json()
    paths = openapi["paths"]

    assert "/api/health" in paths
    assert set(paths["/api/health"]) == {"get"}

    optional_contracts = {
        "/api/articles": {"post", "get"},
        "/api/articles/{article_id}": {"delete", "get"},
        "/api/articles/{article_id}/debates": {"get"},
        "/api/debates": {"post", "get"},
        "/api/debates/{debate_id}": {"delete", "get"},
    }

    for path, expected_methods in optional_contracts.items():
        if path in paths:
            assert expected_methods <= set(paths[path])
