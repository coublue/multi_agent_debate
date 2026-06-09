from collections.abc import Generator
from contextlib import contextmanager

from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.db import get_session
from app.main import app


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


def test_article_create_get_list_and_health_router() -> None:
    with make_test_client() as client:
        health_response = client.get("/api/health")
        assert health_response.status_code == 200

        create_response = client.post(
            "/api/articles",
            json={
                "title": "Local debate article",
                "source": "unit-test",
                "content": "A compact article body for debate.",
                "user_question": "Is the claim credible?",
            },
        )

        assert create_response.status_code == 201
        created = create_response.json()
        assert created["id"] == 1
        assert created["title"] == "Local debate article"
        assert created["source"] == "unit-test"
        assert created["content"] == "A compact article body for debate."
        assert created["user_question"] == "Is the claim credible?"
        assert created["created_at"]
        assert created["updated_at"]

        get_response = client.get(f"/api/articles/{created['id']}")
        assert get_response.status_code == 200
        assert get_response.json()["title"] == "Local debate article"

        list_response = client.get("/api/articles")
        assert list_response.status_code == 200
        assert list_response.json() == [
            {
                "id": created["id"],
                "title": "Local debate article",
                "source": "unit-test",
                "created_at": created["created_at"],
                "debate_count": 0,
                "latest_debate_id": None,
                "latest_debate_status": None,
                "latest_debate_winner": None,
                "latest_debate_credibility_score": None,
                "latest_debate_created_at": None,
            }
        ]


def test_get_missing_article_returns_404() -> None:
    with make_test_client() as client:
        response = client.get("/api/articles/404")

        assert response.status_code == 404
        assert response.json() == {"detail": "Article not found"}
