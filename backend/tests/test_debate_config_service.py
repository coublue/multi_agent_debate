import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.models.article import Article
from app.models.debate import Debate, DebateDepth, DebateStatus, OutputStyle, StageMode
from app.schemas.article import ArticleCreate
from app.services.article_service import create_article
from app.services.debate_service import (
    _article_payload,
    build_follow_up_context,
    create_debate,
    create_follow_up_debate,
    create_topic_debate,
    delete_debate,
)


def _session() -> Session:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    return Session(engine)


def test_article_debate_defaults_to_v2_article_config() -> None:
    with _session() as session:
        article = create_article(
            session,
            ArticleCreate(
                title="Article",
                content="Article content",
                user_question="Is it credible?",
            ),
        )

        debate = create_debate(session, article.id)

    assert debate.debate_depth == DebateDepth.STANDARD
    assert debate.output_style == OutputStyle.DETAILED
    assert debate.stage_mode == StageMode.ARTICLE_9


def test_topic_debate_defaults_to_v2_topic_config() -> None:
    with _session() as session:
        debate = create_topic_debate(session, topic="AI coding tools")

    assert debate.debate_depth == DebateDepth.STANDARD
    assert debate.output_style == OutputStyle.CONCISE
    assert debate.stage_mode == StageMode.TOPIC_5


def test_explicit_debate_config_is_persisted_and_injected_into_payload() -> None:
    with _session() as session:
        debate = create_topic_debate(
            session,
            topic="AI coding tools",
            debate_depth="deep",
            output_style="detailed",
            stage_mode="topic_3",
        )
        article = session.get(Article, debate.article_id)

    assert debate.debate_depth == DebateDepth.DEEP
    assert debate.output_style == OutputStyle.DETAILED
    assert debate.stage_mode == StageMode.TOPIC_3
    assert article is not None
    payload = _article_payload(article, debate)
    assert payload["debate_depth"] == "deep"
    assert payload["output_style"] == "detailed"
    assert payload["stage_mode"] == "topic_3"


def test_article_debate_rejects_topic_stage_mode() -> None:
    with _session() as session:
        article = create_article(
            session,
            ArticleCreate(title="Article", content="Article content"),
        )

        with pytest.raises(ValueError, match="Article debates only support article_9"):
            create_debate(session, article.id, stage_mode="topic_3")


def test_topic_debate_rejects_article_stage_mode() -> None:
    with _session() as session:
        with pytest.raises(ValueError, match="Topic debates only support"):
            create_topic_debate(session, topic="AI coding tools", stage_mode="article_9")


def test_follow_up_snapshot_is_bounded_and_payload_uses_current_question() -> None:
    with _session() as session:
        article = create_article(
            session,
            ArticleCreate(
                title="Article",
                content="Original article content",
                user_question="Original question",
            ),
        )
        parent = create_debate(
            session,
            article.id,
            debate_depth="deep",
            output_style="concise",
        )
        parent.status = DebateStatus.COMPLETED
        parent.main_claim = "M" * 1500
        parent.final_report = {
            "verdict": "V" * 1500,
            "final_summary": "Summary",
            "decision_basis": [f"basis-{index}-" + "x" * 600 for index in range(8)],
            "key_disagreements": [f"disagreement-{index}" for index in range(8)],
            "credible_parts": ["credible"],
            "questionable_parts": ["questionable"],
            "content": "must not be copied",
            "winner": "pro",
        }
        session.add(parent)
        session.commit()
        session.refresh(parent)

        child = create_follow_up_debate(
            session,
            parent.id,
            "Does this hold for startups?",
        )
        payload = _article_payload(article, child)

        assert child.article_id == parent.article_id
        assert child.debate_depth == DebateDepth.DEEP
        assert child.output_style == OutputStyle.CONCISE
        assert child.stage_mode == StageMode.ARTICLE_9
        assert payload["user_question"] == "Does this hold for startups?"
        assert payload["follow_up_context"] == child.parent_context_snapshot
        snapshot = child.parent_context_snapshot
        assert snapshot is not None
        assert len(snapshot["main_claim"]) == 1000
        assert len(snapshot["verdict"]) == 1000
        assert len(snapshot["decision_basis"]) == 5
        assert all(len(item) <= 500 for item in snapshot["decision_basis"])
        assert "content" not in snapshot
        assert "winner" not in snapshot
        assert article.user_question == "Original question"
        assert parent.final_report["content"] == "must not be copied"


def test_follow_up_supports_multiple_levels_and_parent_delete_preserves_child() -> None:
    with _session() as session:
        article = create_article(
            session,
            ArticleCreate(title="Article", content="Article content"),
        )
        root = create_debate(session, article.id)
        root.status = DebateStatus.COMPLETED
        root.final_report = {"verdict": "Root verdict"}
        session.add(root)
        session.commit()
        session.refresh(root)

        child = create_follow_up_debate(session, root.id, "First follow-up")
        child.status = DebateStatus.COMPLETED
        child.final_report = {"verdict": "Child verdict"}
        session.add(child)
        session.commit()
        session.refresh(child)
        grandchild = create_follow_up_debate(session, child.id, "Second follow-up")

        assert grandchild.parent_debate_id == child.id
        assert grandchild.parent_context_snapshot["parent_debate_id"] == child.id
        assert delete_debate(session, child.id)
        session.refresh(grandchild)
        assert grandchild.parent_debate_id is None
        assert grandchild.parent_context_snapshot["parent_debate_id"] == child.id
        assert session.get(Debate, root.id) is not None


def test_build_follow_up_context_ignores_non_list_report_values() -> None:
    parent = Debate(
        id=7,
        article_id=1,
        status=DebateStatus.COMPLETED,
        final_report={
            "decision_basis": "not a list",
            "key_disagreements": None,
        },
    )

    snapshot = build_follow_up_context(parent)

    assert snapshot["decision_basis"] == []
    assert snapshot["key_disagreements"] == []
