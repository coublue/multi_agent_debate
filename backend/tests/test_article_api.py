from collections.abc import Generator
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from app.api.debates import get_debate_service
from app.db import get_session
from app.main import app
from app.models import AgentMessage, Debate, DebateDepth, DebateStage, DebateStatus, OutputStyle, StageMode


@contextmanager
def make_test_client() -> Generator[TestClient, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)

    def override_get_session() -> Generator[Session, None, None]:
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[get_debate_service] = lambda: FakeDebateService()
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


class FakeDebateService:
    def create_debate(
        self,
        session: Session,
        article_id: int,
        *,
        debate_depth: DebateDepth = DebateDepth.STANDARD,
        output_style: OutputStyle | None = None,
        stage_mode: StageMode | None = None,
    ) -> Debate:
        now = datetime.now(UTC)
        existing_count = len(
            session.exec(select(Debate).where(Debate.article_id == article_id)).all()
        )
        debate = Debate(
            article_id=article_id,
            status=DebateStatus.COMPLETED,
            debate_depth=debate_depth,
            output_style=output_style or OutputStyle.DETAILED,
            stage_mode=stage_mode or StageMode.ARTICLE_9,
            winner=f"winner-{existing_count + 1}",
            credibility_score=60 + existing_count,
            created_at=now + timedelta(seconds=existing_count),
            updated_at=now + timedelta(seconds=existing_count),
        )
        session.add(debate)
        session.commit()
        session.refresh(debate)

        message = AgentMessage(
            debate_id=debate.id,
            agent_name="moderator",
            agent_role="moderator",
            round_index=0,
            stage=DebateStage.MODERATOR_OPENING,
            message_type="structured",
            content={"summary": "Opening frame"},
        )
        session.add(message)
        session.commit()
        return debate

    def run_debate_background(self, debate_id: int) -> None:
        return None

    def delete_debate(self, session: Session, debate_id: int) -> bool:
        debate = session.get(Debate, debate_id)
        if debate is None:
            return False

        messages = session.exec(
            select(AgentMessage).where(AgentMessage.debate_id == debate_id)
        ).all()
        for message in messages:
            session.delete(message)
        session.delete(debate)
        session.commit()
        return True


def create_article(client: TestClient, title: str = "Article") -> dict:
    response = client.post(
        "/api/articles",
        json={
            "title": title,
            "source": "unit-test",
            "content": "Article body for article API tests.",
            "user_question": "Is it credible?",
        },
    )
    assert response.status_code == 201
    return response.json()


def create_debate(client: TestClient, article_id: int) -> dict:
    response = client.post("/api/debates", json={"article_id": article_id})
    assert response.status_code == 201
    return response.json()


def test_article_list_includes_debate_count_and_latest_debate_summary() -> None:
    with make_test_client() as client:
        article = create_article(client)
        first_debate = create_debate(client, article["id"])
        latest_debate = create_debate(client, article["id"])

        response = client.get("/api/articles")

        assert response.status_code == 200
        items = response.json()
        assert len(items) == 1
        assert items[0]["id"] == article["id"]
        assert items[0]["user_question"] == "Is it credible?"
        assert items[0]["debate_count"] == 2
        assert items[0]["latest_debate_id"] == latest_debate["id"]
        assert items[0]["latest_debate_status"] == "completed"
        assert items[0]["latest_debate_winner"] == latest_debate["winner"]
        assert items[0]["latest_debate_credibility_score"] == latest_debate[
            "credibility_score"
        ]
        assert items[0]["latest_debate_created_at"] == latest_debate["created_at"]
        assert items[0]["latest_debate_id"] != first_debate["id"]


def test_article_debates_endpoint_lists_related_debates() -> None:
    with make_test_client() as client:
        article = create_article(client, "Article with debates")
        other_article = create_article(client, "Other article")
        older_debate = create_debate(client, article["id"])
        latest_debate = create_debate(client, article["id"])
        create_debate(client, other_article["id"])

        response = client.get(f"/api/articles/{article['id']}/debates")

        assert response.status_code == 200
        assert response.json() == [
            {
                "id": latest_debate["id"],
                "article_id": article["id"],
                "title": "Article with debates",
                "status": "completed",
                "debate_depth": "standard",
                "output_style": "detailed",
                "stage_mode": "article_9",
                "winner": latest_debate["winner"],
                "credibility_score": latest_debate["credibility_score"],
                "created_at": latest_debate["created_at"],
            },
            {
                "id": older_debate["id"],
                "article_id": article["id"],
                "title": "Article with debates",
                "status": "completed",
                "debate_depth": "standard",
                "output_style": "detailed",
                "stage_mode": "article_9",
                "winner": older_debate["winner"],
                "credibility_score": older_debate["credibility_score"],
                "created_at": older_debate["created_at"],
            },
        ]


def test_delete_article_without_debates_removes_article() -> None:
    with make_test_client() as client:
        article = create_article(client)

        response = client.delete(f"/api/articles/{article['id']}")

        assert response.status_code == 204
        assert client.get(f"/api/articles/{article['id']}").status_code == 404
        assert client.get("/api/articles").json() == []


def test_delete_article_with_debates_cascades_to_debates_and_messages() -> None:
    with make_test_client() as client:
        article = create_article(client)
        debate = create_debate(client, article["id"])

        response = client.delete(f"/api/articles/{article['id']}")

        assert response.status_code == 204
        assert client.get(f"/api/articles/{article['id']}").status_code == 404
        assert client.get(f"/api/debates/{debate['id']}").status_code == 404
        assert client.get("/api/debates").json() == []


def test_delete_debate_does_not_delete_article() -> None:
    with make_test_client() as client:
        article = create_article(client)
        debate = create_debate(client, article["id"])

        response = client.delete(f"/api/debates/{debate['id']}")

        assert response.status_code == 204
        article_response = client.get(f"/api/articles/{article['id']}")
        assert article_response.status_code == 200
        assert article_response.json()["title"] == article["title"]
        assert client.get(f"/api/articles/{article['id']}/debates").json() == []
