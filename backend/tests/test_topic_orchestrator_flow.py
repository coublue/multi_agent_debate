from __future__ import annotations

import asyncio
from typing import Any

from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from app.agents.orchestrator import DebateOrchestrator
from app.agents.moderator import ModeratorAgent
from app.agents.pro import ProAgent
from app.models.agent_message import AgentMessage
from app.models.debate import DebateStage, DebateStatus
from app.schemas.article import ArticleCreate
from app.llm import MockChatClient
from app.services.article_service import create_article
from app.services.debate_service import create_and_run_debate


class TopicModeratorAgent:
    name = "topic_moderator"
    role = "moderator"

    async def opening(
        self,
        article: dict[str, Any],
        user_question: str | None = None,
    ) -> dict[str, Any]:
        return {
            "main_claim": article["topic"],
            "debate_topic": article["topic"],
            "key_points": [article.get("background") or article["content"]],
            "controversial_points": [user_question or "No focus question"],
            "rules": [article["debate_mode"]],
        }

    async def midpoint(
        self,
        article: dict[str, Any],
        moderator_opening: dict[str, Any],
        pro_opening: dict[str, Any],
        con_opening: dict[str, Any],
        pro_rebuttal: dict[str, Any],
        con_rebuttal: dict[str, Any],
    ) -> dict[str, Any]:
        return {
            "pro_summary": pro_opening["summary"],
            "con_summary": con_opening["summary"],
            "key_disagreements": ["topic tradeoff"],
            "unresolved_questions": ["implementation details"],
            "focus_for_closing": "Judge the faster topic flow",
            "omitted_rebuttals": [pro_rebuttal, con_rebuttal],
        }


class TopicProAgent:
    name = "topic_pro"
    role = "pro"

    async def opening(
        self,
        article: dict[str, Any],
        moderator_opening: dict[str, Any],
    ) -> dict[str, Any]:
        return {"summary": f"Support {article['topic']}", "mode": article["debate_mode"]}


class TopicConAgent:
    name = "topic_con"
    role = "con"

    async def opening(
        self,
        article: dict[str, Any],
        moderator_opening: dict[str, Any],
    ) -> dict[str, Any]:
        return {"summary": f"Question {article['topic']}", "mode": article["debate_mode"]}


class TopicJudgeAgent:
    name = "topic_judge"
    role = "judge"

    async def report(
        self,
        article: dict[str, Any],
        moderator_opening: dict[str, Any],
        moderator_midpoint: dict[str, Any],
        pro_opening: dict[str, Any],
        con_opening: dict[str, Any],
        pro_rebuttal: dict[str, Any],
        con_rebuttal: dict[str, Any],
        pro_closing: dict[str, Any],
        con_closing: dict[str, Any],
    ) -> dict[str, Any]:
        return {
            "main_claim": moderator_opening["main_claim"],
            "pro_strongest_points": [pro_opening["summary"]],
            "con_strongest_points": [con_opening["summary"]],
            "key_disagreements": moderator_midpoint["key_disagreements"],
            "winner": "pro",
            "credibility_score": 68,
            "credible_parts": ["clear topic"],
            "questionable_parts": ["limited background"],
            "follow_up_questions": ["Should this become a full article debate?"],
            "final_summary": f"Fast topic debate for {article['topic']} completed.",
            "omitted_full_debate_stages": [
                pro_rebuttal,
                con_rebuttal,
                pro_closing,
                con_closing,
            ],
        }


def _topic_orchestrator() -> DebateOrchestrator:
    return DebateOrchestrator(
        moderator=TopicModeratorAgent(),
        pro=TopicProAgent(),
        con=TopicConAgent(),
        judge=TopicJudgeAgent(),
    )


def test_topic_orchestrator_runs_five_stage_flow() -> None:
    results = asyncio.run(
        _topic_orchestrator().run(
            {
                "title": "AI 编程会不会降低初级程序员的价值？",
                "source": "topic",
                "content": "从未来三年就业角度讨论",
                "user_question": "关注就业影响",
                "debate_mode": "topic",
                "topic": "AI 编程会不会降低初级程序员的价值？",
                "background": "从未来三年就业角度讨论",
            }
        )
    )

    assert [result.stage for result in results] == [
        DebateStage.MODERATOR_OPENING,
        DebateStage.PRO_OPENING,
        DebateStage.CON_OPENING,
        DebateStage.MODERATOR_MIDPOINT,
        DebateStage.JUDGE_REPORT,
    ]
    assert [result.round_index for result in results] == [1, 2, 3, 4, 5]
    assert results[0].content["rules"] == ["topic"]
    assert results[-1].content["winner"] == "pro"
    assert results[-1].content["credibility_score"] == 68


def test_topic_debate_service_persists_only_five_stage_messages() -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        article = create_article(
            session,
            ArticleCreate(
                title="AI 编程会不会降低初级程序员的价值？",
                source="topic",
                content="从未来三年就业角度讨论",
                user_question="关注就业影响",
            ),
        )

        debate = asyncio.run(
            create_and_run_debate(session, article.id, orchestrator=_topic_orchestrator())
        )

        messages = list(
            session.exec(
                select(AgentMessage)
                .where(AgentMessage.debate_id == debate.id)
                .order_by(AgentMessage.round_index)
            ).all()
        )

    assert debate.status == DebateStatus.COMPLETED
    assert debate.main_claim == "AI 编程会不会降低初级程序员的价值？"
    assert debate.debate_topic == "AI 编程会不会降低初级程序员的价值？"
    assert debate.winner == "pro"
    assert debate.credibility_score == 68
    assert debate.final_report["final_summary"] == (
        "Fast topic debate for AI 编程会不会降低初级程序员的价值？ completed."
    )
    assert [message.stage for message in messages] == [
        DebateStage.MODERATOR_OPENING,
        DebateStage.PRO_OPENING,
        DebateStage.CON_OPENING,
        DebateStage.MODERATOR_MIDPOINT,
        DebateStage.JUDGE_REPORT,
    ]


def test_topic_agents_use_lightweight_topic_prompts() -> None:
    article = {
        "title": "AI 编程会不会降低初级程序员的价值？",
        "source": "topic",
        "content": "从未来三年就业角度讨论",
        "user_question": "关注就业影响",
        "debate_mode": "topic",
        "topic": "AI 编程会不会降低初级程序员的价值？",
        "background": "从未来三年就业角度讨论",
    }
    moderator_client = MockChatClient(
        '{"main_claim":"AI 编程会影响初级程序员价值",'
        '"debate_topic":"AI 编程与初级程序员价值",'
        '"key_points":["效率","学习路径"],'
        '"controversial_points":["替代还是增强"],'
        '"rules":["简短讨论"]}'
    )
    pro_client = MockChatClient(
        '{"summary":"正方认为会降低部分价值",'
        '"pro_points":["重复性编码更容易被工具完成"],'
        '"limits":["仍需要人类判断"]}'
    )

    asyncio.run(ModeratorAgent(llm_client=moderator_client).opening(article, "关注就业影响"))
    asyncio.run(
        ProAgent(llm_client=pro_client).opening(
            article,
            {"main_claim": "AI 编程会影响初级程序员价值"},
        )
    )

    moderator_prompt = moderator_client.calls[0]["messages"][0]["content"]
    pro_prompt = pro_client.calls[0]["messages"][0]["content"]
    assert "快速话题辩论" in moderator_prompt
    assert "不要使用“原文未提供”" in moderator_prompt
    assert "快速话题辩论" in pro_prompt
    assert "pro_points" in pro_prompt
    assert "只能基于用户提供的原文" not in moderator_prompt
    assert "只能基于原文和主持人开场" not in pro_prompt
