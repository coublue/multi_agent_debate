from __future__ import annotations

import asyncio
from pathlib import Path

import pytest

from app.agents.base import BaseAgent
from app.llm import DeepSeekChatClient, MockChatClient


def test_parse_json_from_fenced_model_output() -> None:
    output = """```json
{
  "winner": "mixed",
  "score": 72
}
```"""

    assert BaseAgent.parse_json(output) == {"winner": "mixed", "score": 72}


def test_parse_json_embedded_in_model_output() -> None:
    output = 'Here is the result:\n{"main_claim": "x", "points": ["a", "b"]}\nDone.'

    assert BaseAgent.parse_json(output) == {
        "main_claim": "x",
        "points": ["a", "b"],
    }


def test_render_prompt_replaces_simple_variables() -> None:
    rendered = BaseAgent.render_prompt_text(
        "Title: {{ title }}\nQuestion: {question}\nKeep: {missing}",
        {"title": "A", "question": "Why?"},
    )

    assert rendered == "Title: A\nQuestion: Why?\nKeep: {missing}"


def test_agent_can_be_constructed_without_prompt_path() -> None:
    agent = BaseAgent(llm_client=MockChatClient())

    rendered = agent.render_prompt_text("Stage {stage}: {{ topic }}", {"stage": "x", "topic": "y"})

    assert rendered == "Stage x: y"


def test_run_prompt_uses_mock_llm_and_parses_json() -> None:
    mock = MockChatClient('{"ok": true, "summary": "done"}')
    agent = BaseAgent(llm_client=mock, temperature=0.1)

    result = asyncio.run(
        agent.run_prompt(
            prompt="Judge article: {{ article }}",
            context={"article": "example"},
        )
    )

    assert result.ok is True
    assert result.data == {"ok": True, "summary": "done"}
    assert mock.calls[0]["model"] is None
    assert mock.calls[0]["temperature"] == 0.1
    sent_prompt = mock.calls[0]["messages"][0]["content"]
    assert sent_prompt.startswith("Judge article: example")
    assert "实际输入 JSON" in sent_prompt
    assert '"article": "example"' in sent_prompt


def test_run_prompt_uses_inline_prompt_and_context() -> None:
    mock = MockChatClient('{"stage": "opening"}')
    agent = BaseAgent(llm_client=mock)

    result = asyncio.run(
        agent.run_prompt(
            prompt="Stage {{ stage }}: {{ article }}",
            context={"article": "text"},
            stage="opening",
        )
    )

    assert result.ok is True
    assert result.data == {"stage": "opening"}
    sent_prompt = mock.calls[0]["messages"][0]["content"]
    assert sent_prompt.startswith("Stage opening: text")
    assert '"article": "text"' in sent_prompt
    assert '"stage": "opening"' in sent_prompt


def test_deepseek_client_without_api_key_uses_mock(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DEEPSEEK_API_KEY", raising=False)
    client = DeepSeekChatClient(api_key="")

    response = asyncio.run(client.chat([{"role": "user", "content": "hello"}]))

    assert response == "{}"


def test_run_prompt_returns_structured_parse_error() -> None:
    agent = BaseAgent(llm_client=MockChatClient("not json"))

    result = asyncio.run(
        agent.run_prompt(
            prompt="Return JSON for {{ topic }}",
            context={"topic": "logic"},
        )
    )

    assert result.ok is False
    assert result.error is not None
    assert result.error["code"] == "json_not_found"
    assert "output_preview" in result.error["details"]
