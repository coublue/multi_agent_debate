from collections.abc import Generator

from sqlalchemy import inspect, text
from sqlmodel import Session, SQLModel, create_engine

from app.config import get_settings


settings = get_settings()
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, echo=False, connect_args=connect_args)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    _migrate_sqlite_debates()


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


def _migrate_sqlite_debates() -> None:
    if engine.dialect.name != "sqlite":
        return

    inspector = inspect(engine)
    if "debates" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("debates")}
    migrations = {
        "debate_depth": "ALTER TABLE debates ADD COLUMN debate_depth VARCHAR NOT NULL DEFAULT 'standard'",
        "output_style": "ALTER TABLE debates ADD COLUMN output_style VARCHAR NOT NULL DEFAULT 'detailed'",
        "stage_mode": "ALTER TABLE debates ADD COLUMN stage_mode VARCHAR NOT NULL DEFAULT 'article_9'",
        "parent_debate_id": "ALTER TABLE debates ADD COLUMN parent_debate_id INTEGER REFERENCES debates(id) ON DELETE SET NULL",
        "follow_up_question": "ALTER TABLE debates ADD COLUMN follow_up_question TEXT",
        "parent_context_snapshot": "ALTER TABLE debates ADD COLUMN parent_context_snapshot JSON",
    }

    with engine.begin() as connection:
        for column_name, statement in migrations.items():
            if column_name not in existing_columns:
                connection.execute(text(statement))
        connection.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_debates_parent_debate_id "
                "ON debates (parent_debate_id)"
            )
        )
        connection.execute(
            text(
                """
                UPDATE debates
                SET status = CASE status
                    WHEN 'PENDING' THEN 'pending'
                    WHEN 'RUNNING' THEN 'running'
                    WHEN 'COMPLETED' THEN 'completed'
                    WHEN 'FAILED' THEN 'failed'
                    ELSE status
                END
                """
            )
        )
        connection.execute(
            text(
                """
                UPDATE agent_messages
                SET stage = CASE stage
                    WHEN 'MODERATOR_OPENING' THEN 'moderator_opening'
                    WHEN 'PRO_OPENING' THEN 'pro_opening'
                    WHEN 'CON_OPENING' THEN 'con_opening'
                    WHEN 'PRO_REBUTTAL' THEN 'pro_rebuttal'
                    WHEN 'CON_REBUTTAL' THEN 'con_rebuttal'
                    WHEN 'MODERATOR_MIDPOINT' THEN 'moderator_midpoint'
                    WHEN 'PRO_CLOSING' THEN 'pro_closing'
                    WHEN 'CON_CLOSING' THEN 'con_closing'
                    WHEN 'JUDGE_REPORT' THEN 'judge_report'
                    ELSE stage
                END
                """
            )
        )
        connection.execute(
            text(
                """
                UPDATE debates
                SET output_style = 'concise',
                    stage_mode = 'topic_5'
                WHERE article_id IN (
                    SELECT id FROM articles WHERE source = 'topic'
                )
                """
            )
        )
