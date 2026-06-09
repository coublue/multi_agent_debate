import asyncio
from pathlib import Path

from app.agents.con_agent import ConAgent
from app.agents.judge import JudgeAgent
from app.agents.moderator import ModeratorAgent
from app.agents.pro import ProAgent
from app.llm import MockChatClient


PROMPT_DIR = Path(__file__).resolve().parents[1] / "app" / "prompts"

PROMPT_FILES = [
    "moderator_opening.txt",
    "moderator_midpoint.txt",
    "pro_opening.txt",
    "pro_rebuttal.txt",
    "pro_closing.txt",
    "con_opening.txt",
    "con_rebuttal.txt",
    "con_closing.txt",
    "judge.txt",
]


def test_prompt_files_exist_and_include_core_constraints():
    for prompt_file in PROMPT_FILES:
        path = PROMPT_DIR / prompt_file
        assert path.exists(), f"missing prompt: {prompt_file}"
        text = path.read_text(encoding="utf-8")
        assert "只能基于" in text
        assert "不得编造外部事实" in text
        assert "不得假装" in text
        assert "联网" in text


def test_json_prompts_include_expected_output_fields():
    expected_fields = {
        "moderator_opening.txt": [
            "main_claim",
            "debate_topic",
            "key_points",
            "controversial_points",
            "rules",
        ],
        "moderator_midpoint.txt": [
            "pro_summary",
            "con_summary",
            "key_disagreements",
            "unresolved_questions",
            "focus_for_closing",
        ],
        "judge.txt": [
            "main_claim",
            "pro_strongest_points",
            "con_strongest_points",
            "key_disagreements",
            "winner",
            "credibility_score",
            "credible_parts",
            "questionable_parts",
            "follow_up_questions",
            "final_summary",
        ],
    }

    for prompt_file, fields in expected_fields.items():
        text = (PROMPT_DIR / prompt_file).read_text(encoding="utf-8")
        for field in fields:
            assert field in text


def test_agent_prompt_includes_context_as_json():
    async def run_one():
        client = MockChatClient('{"ok": true}')
        agent = ModeratorAgent(llm_client=client)
        result = await agent.opening(
            {"title": "Title", "content": "Article body"},
            user_question="Question?",
        )

        assert result.ok
        assert result.rendered_prompt is not None
        assert "实际输入 JSON" in result.rendered_prompt
        assert '"article"' in result.rendered_prompt
        assert '"content": "Article body"' in result.rendered_prompt
        assert '"user_question": "Question?"' in result.rendered_prompt

    asyncio.run(run_one())


def test_agent_methods_can_be_called_with_fallback_base_agent(monkeypatch):
    async def run_all():
        async def fake_call_llm(self, prompt):
            return '{"ok": true, "stage": "mocked"}'

        for agent_class in (ModeratorAgent, ProAgent, ConAgent, JudgeAgent):
            base_class = agent_class.__mro__[1]
            if hasattr(base_class, "call_llm"):
                monkeypatch.setattr(base_class, "call_llm", fake_call_llm)

        def is_ok(result):
            return result.get("stage") is not None if isinstance(result, dict) else result.ok

        def rendered_prompt(result):
            return result["prompt"] if isinstance(result, dict) else result.rendered_prompt

        article = {"title": "测试文章", "content": "原文内容"}
        moderator = ModeratorAgent()
        pro = ProAgent()
        con = ConAgent()
        judge = JudgeAgent()

        opening = await moderator.opening(article, user_question="可信吗")
        assert is_ok(opening)
        assert "main_claim" in rendered_prompt(opening)

        pro_opening = await pro.opening(article, opening)
        assert is_ok(pro_opening)

        con_opening = await con.opening(article, opening)
        assert is_ok(con_opening)

        pro_rebuttal = await pro.rebuttal(article, opening, pro_opening, con_opening)
        assert is_ok(pro_rebuttal)

        con_rebuttal = await con.rebuttal(
            article, opening, pro_opening, con_opening, pro_rebuttal
        )
        assert is_ok(con_rebuttal)

        midpoint = await moderator.midpoint(
            article, opening, pro_opening, con_opening, pro_rebuttal, con_rebuttal
        )
        assert is_ok(midpoint)

        pro_closing = await pro.closing(opening, midpoint, con_rebuttal)
        assert is_ok(pro_closing)

        con_closing = await con.closing(opening, midpoint, pro_rebuttal)
        assert is_ok(con_closing)

        report = await judge.report(
            article,
            opening,
            midpoint,
            pro_opening,
            con_opening,
            pro_rebuttal,
            con_rebuttal,
            pro_closing,
            con_closing,
        )
        assert is_ok(report)
        assert "credibility_score" in rendered_prompt(report)

    asyncio.run(run_all())
