from sqlalchemy import inspect, text
from sqlalchemy.pool import StaticPool
from sqlmodel import create_engine

from app import db


def test_sqlite_migration_adds_nullable_follow_up_columns(monkeypatch) -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    with engine.begin() as connection:
        connection.execute(
            text(
                """
                CREATE TABLE articles (
                    id INTEGER PRIMARY KEY,
                    source VARCHAR
                )
                """
            )
        )
        connection.execute(
            text(
                """
                CREATE TABLE debates (
                    id INTEGER PRIMARY KEY,
                    article_id INTEGER NOT NULL,
                    status VARCHAR NOT NULL
                )
                """
            )
        )
        connection.execute(
            text(
                """
                CREATE TABLE agent_messages (
                    id INTEGER PRIMARY KEY,
                    stage VARCHAR NOT NULL
                )
                """
            )
        )
        connection.execute(
            text("INSERT INTO debates (id, article_id, status) VALUES (1, 1, 'COMPLETED')")
        )

    monkeypatch.setattr(db, "engine", engine)
    db._migrate_sqlite_debates()

    columns = {column["name"]: column for column in inspect(engine).get_columns("debates")}
    assert columns["parent_debate_id"]["nullable"] is True
    assert columns["follow_up_question"]["nullable"] is True
    assert columns["parent_context_snapshot"]["nullable"] is True
    with engine.connect() as connection:
        row = connection.execute(
            text(
                "SELECT status, parent_debate_id, follow_up_question, "
                "parent_context_snapshot FROM debates WHERE id = 1"
            )
        ).one()
    assert tuple(row) == ("completed", None, None, None)
