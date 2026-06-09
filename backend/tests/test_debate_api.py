from collections.abc import Generator
from contextlib import contextmanager
from datetime import UTC, datetime

from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from app.api.debates import get_debate_service
from app.db import get_session
from app.main import app
from app.models import AgentMessage, Debate, DebateStage, DebateStatus


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
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


class FakeDebateService:
    def create_debate(self, session: Session, article_id: int) -> Debate:
        now = datetime.now(UTC)
        final_report = {
            "main_claim": "The article makes a testable claim.",
            "pro_strongest_points": ["The claim has internal consistency."],
            "con_strongest_points": ["The evidence is incomplete."],
            "key_disagreements": ["Evidence quality"],
            "winner": "mixed",
            "credibility_score": 62,
            "credible_parts": ["The basic timeline is plausible."],
            "questionable_parts": ["The causal leap needs support."],
            "follow_up_questions": ["What source verifies the claim?"],
            "final_summary": "The article is partially credible.",
        }
        debate = Debate(
            article_id=article_id,
            status=DebateStatus.COMPLETED,
            main_claim=final_report["main_claim"],
            debate_topic="Credibility of the article",
            final_report=final_report,
            winner=final_report["winner"],
            credibility_score=final_report["credibility_score"],
            created_at=now,
            updated_at=now,
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


def test_create_list_and_get_debate_with_fake_service() -> None:
    with make_test_client() as client:
        app.dependency_overrides[get_debate_service] = lambda: FakeDebateService()
        article_response = client.post(
            "/api/articles",
            json={
                "title": "Debate me",
                "source": None,
                "content": "An article that should be debated.",
                "user_question": None,
            },
        )
        article_id = article_response.json()["id"]

        create_response = client.post("/api/debates", json={"article_id": article_id})

        assert create_response.status_code == 201
        created = create_response.json()
        assert created["article_id"] == article_id
        assert created["status"] == "completed"
        assert created["winner"] == "mixed"
        assert created["credibility_score"] == 62
        assert created["final_report"]["final_summary"] == "The article is partially credible."

        list_response = client.get("/api/debates")
        assert list_response.status_code == 200
        assert list_response.json() == [
            {
                "id": created["id"],
                "article_id": article_id,
                "title": "Debate me",
                "status": "completed",
                "winner": "mixed",
                "credibility_score": 62,
                "created_at": created["created_at"],
            }
        ]

        detail_response = client.get(f"/api/debates/{created['id']}")
        assert detail_response.status_code == 200
        detail = detail_response.json()
        assert detail["article"]["title"] == "Debate me"
        assert detail["messages"][0]["agent_name"] == "moderator"
        assert detail["messages"][0]["stage"] == "moderator_opening"

        delete_response = client.delete(f"/api/debates/{created['id']}")
        assert delete_response.status_code == 204

        missing_detail_response = client.get(f"/api/debates/{created['id']}")
        assert missing_detail_response.status_code == 404

        list_after_delete_response = client.get("/api/debates")
        assert list_after_delete_response.status_code == 200
        assert list_after_delete_response.json() == []


def test_create_debate_for_missing_article_returns_404() -> None:
    with make_test_client() as client:
        app.dependency_overrides[get_debate_service] = lambda: FakeDebateService()

        response = client.post("/api/debates", json={"article_id": 404})

        assert response.status_code == 404
        assert response.json() == {"detail": "Article not found"}


def test_delete_missing_debate_returns_404() -> None:
    with make_test_client() as client:
        app.dependency_overrides[get_debate_service] = lambda: FakeDebateService()

        response = client.delete("/api/debates/404")

        assert response.status_code == 404
        assert response.json() == {"detail": "Debate not found"}
