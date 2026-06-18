from collections.abc import Generator
from contextlib import contextmanager
from datetime import UTC, datetime

from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from app.api.debates import get_debate_service
from app.db import get_session
from app.main import app
from app.models import (
    AgentMessage,
    Debate,
    DebateDepth,
    DebateStage,
    DebateStatus,
    OutputStyle,
    StageMode,
)
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


class FakeDebateService:
    def __init__(
        self,
        *,
        create_status: DebateStatus = DebateStatus.PENDING,
        seed_message: bool = False,
        seed_result_fields: bool = False,
    ) -> None:
        self.background_runs: list[int] = []
        self.create_status = create_status
        self.seed_message = seed_message
        self.seed_result_fields = seed_result_fields

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
        debate = Debate(
            article_id=article_id,
            status=self.create_status,
            main_claim="Old main claim" if self.seed_result_fields else None,
            debate_topic="Old debate topic" if self.seed_result_fields else None,
            debate_depth=debate_depth,
            output_style=output_style or OutputStyle.DETAILED,
            stage_mode=stage_mode or StageMode.ARTICLE_9,
            final_report=(
                {
                    "summary": "Old judge summary",
                    "content": "Old report body",
                    "winner": "mixed",
                    "credibility_score": 42,
                    "final_summary": "Old final summary",
                }
                if self.seed_result_fields
                else None
            ),
            winner="mixed" if self.seed_result_fields else None,
            credibility_score=42 if self.seed_result_fields else None,
            error_message="Old failure" if self.create_status == DebateStatus.FAILED else None,
            created_at=now,
            updated_at=now,
        )
        session.add(debate)
        session.commit()
        session.refresh(debate)
        if self.seed_message:
            message = AgentMessage(
                debate_id=debate.id,
                agent_name="moderator",
                agent_role="moderator",
                round_index=0,
                stage=DebateStage.MODERATOR_OPENING,
                message_type="structured",
                content={"summary": "Old opening"},
            )
            session.add(message)
            session.commit()
        return debate

    async def run_debate_background(self, debate_id: int) -> None:
        self.background_runs.append(debate_id)

    def create_follow_up_debate(
        self,
        session: Session,
        parent_debate_id: int,
        question: str,
        *,
        debate_depth: DebateDepth | None = None,
        output_style: OutputStyle | None = None,
        stage_mode: StageMode | None = None,
    ) -> Debate:
        return debate_service.create_follow_up_debate(
            session=session,
            parent_debate_id=parent_debate_id,
            question=question,
            debate_depth=debate_depth,
            output_style=output_style,
            stage_mode=stage_mode,
        )

    def rerun_debate(self, session: Session, debate_id: int) -> Debate | None:
        return debate_service.rerun_debate(session=session, debate_id=debate_id)

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
        assert created["debate_depth"] == "standard"
        assert created["output_style"] == "detailed"
        assert created["stage_mode"] == "article_9"
        assert fake_service.background_runs == [created["id"]]

        list_response = client.get("/api/debates")
        assert list_response.status_code == 200
        assert list_response.json() == [
            {
                "id": created["id"],
                "article_id": article_id,
                "title": "Debate me",
                "status": "pending",
                "debate_depth": "standard",
                "output_style": "detailed",
                "stage_mode": "article_9",
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


def test_create_debate_accepts_explicit_lightweight_config() -> None:
    with make_test_client() as client:
        fake_service = FakeDebateService()
        app.dependency_overrides[get_debate_service] = lambda: fake_service
        article_response = client.post(
            "/api/articles",
            json={
                "title": "Debate me deeply",
                "source": None,
                "content": "An article that should be debated.",
                "user_question": None,
            },
        )
        article_id = article_response.json()["id"]

        response = client.post(
            "/api/debates",
            json={
                "article_id": article_id,
                "debate_depth": "deep",
                "output_style": "concise",
                "stage_mode": "article_9",
            },
        )

        assert response.status_code == 201
        created = response.json()
        assert created["debate_depth"] == "deep"
        assert created["output_style"] == "concise"
        assert created["stage_mode"] == "article_9"


def test_rerun_failed_debate_clears_old_results_and_restarts_background() -> None:
    with make_test_client() as client:
        fake_service = FakeDebateService(
            create_status=DebateStatus.FAILED,
            seed_message=True,
            seed_result_fields=True,
        )
        app.dependency_overrides[get_debate_service] = lambda: fake_service
        article_response = client.post(
            "/api/articles",
            json={
                "title": "Failed debate",
                "source": "unit-test",
                "content": "A failed debate should be restartable.",
                "user_question": None,
            },
        )
        article_id = article_response.json()["id"]
        create_response = client.post("/api/debates", json={"article_id": article_id})
        created = create_response.json()
        assert created["status"] == "failed"
        assert fake_service.background_runs == [created["id"]]

        rerun_response = client.post(f"/api/debates/{created['id']}/rerun")

        assert rerun_response.status_code == 200
        rerun = rerun_response.json()
        assert rerun["id"] == created["id"]
        assert rerun["status"] == "pending"
        assert rerun["main_claim"] is None
        assert rerun["debate_topic"] is None
        assert rerun["final_report"] is None
        assert rerun["winner"] is None
        assert rerun["credibility_score"] is None
        assert rerun["error_message"] is None
        assert rerun["debate_depth"] == "standard"
        assert rerun["output_style"] == "detailed"
        assert rerun["stage_mode"] == "article_9"
        assert fake_service.background_runs == [created["id"], created["id"]]

        detail_response = client.get(f"/api/debates/{created['id']}")
        assert detail_response.status_code == 200
        assert detail_response.json()["messages"] == []


def test_rerun_debate_rejects_non_failed_status() -> None:
    with make_test_client() as client:
        fake_service = FakeDebateService(create_status=DebateStatus.COMPLETED)
        app.dependency_overrides[get_debate_service] = lambda: fake_service
        article_response = client.post(
            "/api/articles",
            json={
                "title": "Completed debate",
                "source": "unit-test",
                "content": "Completed debates should not rerun in V3.",
                "user_question": None,
            },
        )
        article_id = article_response.json()["id"]
        create_response = client.post("/api/debates", json={"article_id": article_id})
        created = create_response.json()

        rerun_response = client.post(f"/api/debates/{created['id']}/rerun")

        assert rerun_response.status_code == 409
        assert rerun_response.json() == {"detail": "Only failed debates can be rerun"}
        assert fake_service.background_runs == [created["id"]]


def test_rerun_missing_debate_returns_404() -> None:
    with make_test_client() as client:
        app.dependency_overrides[get_debate_service] = lambda: FakeDebateService()

        response = client.post("/api/debates/404/rerun")

        assert response.status_code == 404
        assert response.json() == {"detail": "Debate not found"}


def test_delete_missing_debate_returns_404() -> None:
    with make_test_client() as client:
        app.dependency_overrides[get_debate_service] = lambda: FakeDebateService()

        response = client.delete("/api/debates/404")

        assert response.status_code == 404
        assert response.json() == {"detail": "Debate not found"}


def test_create_follow_up_inherits_parent_and_starts_background() -> None:
    with make_test_client() as client:
        fake_service = FakeDebateService(
            create_status=DebateStatus.COMPLETED,
            seed_result_fields=True,
        )
        app.dependency_overrides[get_debate_service] = lambda: fake_service
        article = client.post(
            "/api/articles",
            json={
                "title": "Parent article",
                "content": "Original immutable content",
                "user_question": "Original question",
            },
        ).json()
        parent = client.post(
            "/api/debates",
            json={
                "article_id": article["id"],
                "debate_depth": "deep",
                "output_style": "concise",
                "stage_mode": "article_9",
            },
        ).json()

        response = client.post(
            f"/api/debates/{parent['id']}/follow-ups",
            json={"question": "  Does it still hold for startups?  "},
        )

        assert response.status_code == 201
        child = response.json()
        assert child["article_id"] == parent["article_id"]
        assert child["parent_debate_id"] == parent["id"]
        assert child["follow_up_question"] == "Does it still hold for startups?"
        assert child["debate_depth"] == "deep"
        assert child["output_style"] == "concise"
        assert child["stage_mode"] == "article_9"
        assert fake_service.background_runs == [parent["id"], child["id"]]

        detail = client.get(f"/api/debates/{child['id']}").json()
        assert detail["article"]["content"] == "Original immutable content"
        assert detail["article"]["user_question"] == "Original question"


def test_follow_up_validates_parent_status_missing_parent_and_blank_question() -> None:
    with make_test_client() as client:
        fake_service = FakeDebateService(create_status=DebateStatus.PENDING)
        app.dependency_overrides[get_debate_service] = lambda: fake_service
        article = client.post(
            "/api/articles",
            json={"title": "Pending", "content": "Still running"},
        ).json()
        parent = client.post("/api/debates", json={"article_id": article["id"]}).json()

        pending = client.post(
            f"/api/debates/{parent['id']}/follow-ups",
            json={"question": "What next?"},
        )
        missing = client.post(
            "/api/debates/404/follow-ups",
            json={"question": "What next?"},
        )
        blank = client.post(
            f"/api/debates/{parent['id']}/follow-ups",
            json={"question": "   "},
        )

        assert pending.status_code == 409
        assert pending.json() == {
            "detail": "Only completed debates can be followed up"
        }
        assert missing.status_code == 404
        assert missing.json() == {"detail": "Debate not found"}
        assert blank.status_code == 422


def test_follow_up_accepts_config_overrides_and_deduplicates_active_request() -> None:
    with make_test_client() as client:
        fake_service = FakeDebateService(create_status=DebateStatus.COMPLETED)
        app.dependency_overrides[get_debate_service] = lambda: fake_service
        article = client.post(
            "/api/articles",
            json={"title": "Parent", "content": "Body"},
        ).json()
        parent = client.post("/api/debates", json={"article_id": article["id"]}).json()
        payload = {
            "question": "Narrow the scope",
            "debate_depth": "quick",
            "output_style": "concise",
            "stage_mode": "article_9",
        }

        first = client.post(f"/api/debates/{parent['id']}/follow-ups", json=payload)
        second = client.post(f"/api/debates/{parent['id']}/follow-ups", json=payload)

        assert first.status_code == 201
        assert second.status_code == 201
        assert second.json()["id"] == first.json()["id"]
        assert first.json()["debate_depth"] == "quick"
        assert first.json()["output_style"] == "concise"
        assert fake_service.background_runs == [parent["id"], first.json()["id"]]
