from collections.abc import Generator
from contextlib import contextmanager

from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.api.debates import get_debate_service
from app.db import get_session
from app.main import app
from app.models import Debate
from app.services import debate_service


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


class FakeTopicDebateService:
    def __init__(self) -> None:
        self.background_runs: list[int] = []

    def create_topic_debate(
        self,
        session: Session,
        *,
        topic: str,
        background: str | None = None,
        user_question: str | None = None,
    ) -> Debate:
        return debate_service.create_topic_debate(
            session=session,
            topic=topic,
            background=background,
            user_question=user_question,
        )

    async def run_topic_debate_background(self, debate_id: int) -> None:
        self.background_runs.append(debate_id)


def test_create_topic_debate_creates_topic_article_and_pending_debate() -> None:
    with make_test_client() as client:
        fake_service = FakeTopicDebateService()
        app.dependency_overrides[get_debate_service] = lambda: fake_service

        response = client.post(
            "/api/topic-debates",
            json={
                "topic": "AI coding tools will change junior developer hiring",
                "background": "Discuss the next three years of software jobs.",
                "user_question": "Focus on employment impact.",
            },
        )

        assert response.status_code == 201
        created = response.json()
        assert created["status"] == "pending"
        assert created["winner"] is None
        assert created["final_report"] is None
        assert fake_service.background_runs == [created["id"]]

        detail_response = client.get(f"/api/debates/{created['id']}")
        assert detail_response.status_code == 200
        detail = detail_response.json()
        assert detail["article"]["title"] == (
            "AI coding tools will change junior developer hiring"
        )
        assert detail["article"]["source"] == "topic"
        assert detail["article"]["content"] == (
            "Discuss the next three years of software jobs."
        )
        assert detail["article"]["user_question"] == "Focus on employment impact."
        assert detail["messages"] == []


def test_create_topic_debate_uses_topic_as_content_without_background() -> None:
    with make_test_client() as client:
        fake_service = FakeTopicDebateService()
        app.dependency_overrides[get_debate_service] = lambda: fake_service

        response = client.post(
            "/api/topic-debates",
            json={"topic": "Remote work improves engineering productivity"},
        )

        assert response.status_code == 201
        created = response.json()

        detail_response = client.get(f"/api/debates/{created['id']}")
        assert detail_response.status_code == 200
        article = detail_response.json()["article"]
        assert article["source"] == "topic"
        assert article["content"] == "Remote work improves engineering productivity"
        assert article["user_question"] is None


def test_create_topic_debate_returns_before_debate_execution() -> None:
    with make_test_client() as client:
        fake_service = FakeTopicDebateService()
        app.dependency_overrides[get_debate_service] = lambda: fake_service

        response = client.post(
            "/api/topic-debates",
            json={"topic": "A short topic should create a quick debate"},
        )

        assert response.status_code == 201
        created = response.json()
        assert created["status"] == "pending"
        assert created["main_claim"] is None
        assert created["debate_topic"] is None
        assert fake_service.background_runs == [created["id"]]


def test_create_topic_debate_requires_topic() -> None:
    with make_test_client() as client:
        app.dependency_overrides[get_debate_service] = lambda: FakeTopicDebateService()

        response = client.post("/api/topic-debates", json={})

        assert response.status_code == 422


def test_create_topic_debate_rejects_blank_topic() -> None:
    with make_test_client() as client:
        app.dependency_overrides[get_debate_service] = lambda: FakeTopicDebateService()

        response = client.post("/api/topic-debates", json={"topic": "   "})

        assert response.status_code == 422
