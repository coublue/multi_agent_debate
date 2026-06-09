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
    background_runs: list[int] = []

    def create_debate(self, session: Session, article_id: int) -> Debate:
        now = datetime.now(UTC)
        debate = Debate(
            article_id=article_id,
            status=DebateStatus.PENDING,
            created_at=now,
            updated_at=now,
        )
        session.add(debate)
        session.commit()
        session.refresh(debate)
        return debate

    async def run_debate_background(self, debate_id: int) -> None:
        self.background_runs.append(debate_id)

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
        fake_service = FakeDebateService()
        fake_service.background_runs = []
        app.dependency_overrides[get_debate_service] = lambda: fake_service
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
        assert created["status"] == "pending"
        assert created["winner"] is None
        assert created["credibility_score"] is None
        assert created["final_report"] is None
        assert fake_service.background_runs == [created["id"]]

        list_response = client.get("/api/debates")
        assert list_response.status_code == 200
        assert list_response.json() == [
            {
                "id": created["id"],
                "article_id": article_id,
                "title": "Debate me",
                "status": "pending",
                "winner": None,
                "credibility_score": None,
                "created_at": created["created_at"],
            }
        ]

        detail_response = client.get(f"/api/debates/{created['id']}")
        assert detail_response.status_code == 200
        detail = detail_response.json()
        assert detail["article"]["title"] == "Debate me"
        assert detail["messages"] == []

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
