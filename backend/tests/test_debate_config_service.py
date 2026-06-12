import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.models.article import Article
from app.models.debate import DebateDepth, OutputStyle, StageMode
from app.schemas.article import ArticleCreate
from app.services.article_service import create_article
from app.services.debate_service import _article_payload, create_debate, create_topic_debate


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
