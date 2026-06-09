# 架构说明

本项目是本地文本型 4 Agent 文章辩论助手。后端接收文章，持久化文章和辩论状态，按固定阶段调用 Agent，最后保存裁判报告。

## 4 个 Agent

- `Moderator Agent`：提炼文章主张、定义辩题、约束辩论规则，并在中场总结分歧。
- `Pro Agent`：站在支持文章主张的一侧，提炼可支持的证据、论点和解释。
- `Con Agent`：站在质疑文章主张的一侧，指出证据缺口、逻辑漏洞和替代解释。
- `Judge Agent`：比较双方论证，给出胜方、可信度评分、可信/存疑部分和后续追问。

## 9 阶段流程

辩论阶段由 `DebateStage` 枚举固定，prompt 文件与阶段一一对应：

1. `moderator_opening`：主持人抽取主张、辩题、关键点和规则。
2. `pro_opening`：正方开篇陈述。
3. `con_opening`：反方开篇陈述。
4. `pro_rebuttal`：正方回应反方质疑。
5. `con_rebuttal`：反方回应正方论点。
6. `moderator_midpoint`：主持人中场总结共识、分歧和收束方向。
7. `pro_closing`：正方总结。
8. `con_closing`：反方总结。
9. `judge_report`：裁判输出最终结构化报告。

状态由 `DebateStatus` 表示：

- `pending`
- `running`
- `completed`
- `failed`

## 数据表

### `articles`

保存用户提交的文章。

核心字段：

- `id`
- `title`
- `source`
- `content`
- `user_question`
- `created_at`
- `updated_at`

### `debates`

保存一场辩论的总体状态和最终结果。

核心字段：

- `id`
- `article_id`
- `status`
- `main_claim`
- `debate_topic`
- `final_report`
- `winner`
- `credibility_score`
- `error_message`
- `created_at`
- `updated_at`

### `agent_messages`

保存每个阶段的 Agent 输出，便于回放、调试和构建详情页。

核心字段：

- `id`
- `debate_id`
- `agent_name`
- `agent_role`
- `round_index`
- `stage`
- `message_type`
- `content`
- `target_agent`
- `created_at`

## 上下文与成本控制

- 使用 `MAX_ARTICLE_CHARS` 限制输入文章长度，默认 `12000`。
- 使用 `MAX_AGENT_OUTPUT_CHARS` 限制单个 Agent 输出长度，默认 `2500`。
- 使用 `DEBATE_ROUNDS` 控制辩论轮次，默认 `3`；当前 9 阶段流程中以开篇、反驳、总结为主。
- 每阶段优先传入必要上下文：原文、用户问题、主持人提炼的主张、前序 Agent 摘要和关键分歧。
- Agent 输出尽量使用结构化 JSON schema，减少后续阶段解析成本。
- 每个阶段结果落库到 `agent_messages`，后续阶段可读取摘要而不是重复拼接完整输出。
- 失败时记录 `failed` 状态和 `error_message`，避免重复消耗 LLM 调用成本。

## DeepSeek 默认接入

项目默认使用 DeepSeek 的 OpenAI-compatible 接口：

- `DEEPSEEK_API_KEY`：必填，用于真实 LLM 调用。
- `DEEPSEEK_BASE_URL`：默认 `https://api.deepseek.com`。
- `DEEPSEEK_MODEL`：默认 `deepseek-v4-pro`。
- `LLM_TIMEOUT_SECONDS`：默认 `120`。

如果项目使用 LangChain，默认应通过 `langchain_openai.ChatOpenAI` 接入，并设置：

```python
ChatOpenAI(
    api_key=os.environ["DEEPSEEK_API_KEY"],
    base_url="https://api.deepseek.com",
    model="deepseek-v4-pro",
)
```

除非明确指定其他模型或供应商，新增 LLM/Agent 配置都应保持以上 DeepSeek 默认约定。

