# 架构说明

本项目是本地文本型 4 Agent 文章辩论助手。后端接收文章，持久化文章和辩论状态，按固定阶段调用 Agent，最后保存裁判报告。

V2 起，文章作为独立资源保留在数据库中，可单独查看和删除。删除单场辩论不会删除文章；删除文章会级联删除该文章下的辩论和阶段消息。V2 也支持快速话题辩论，话题辩论复用文章、辩论和阶段消息三张表，通过特殊文章来源 `source = "topic"` 区分。

## 4 个 Agent

- `Moderator Agent`：提炼文章主张、定义辩题、约束辩论规则，并在中场总结分歧。
- `Pro Agent`：站在支持文章主张的一侧，提炼可支持的证据、论点和解释。
- `Con Agent`：站在质疑文章主张的一侧，指出证据缺口、逻辑漏洞和替代解释。
- `Judge Agent`：比较双方论证，给出胜方、可信度评分、可信/存疑部分和后续追问。

## 辩论流程

辩论阶段由 `DebateStage` 枚举固定，文章辩论使用完整 9 阶段，prompt 文件与阶段一一对应：

1. `moderator_opening`：主持人抽取主张、辩题、关键点和规则。
2. `pro_opening`：正方开篇陈述。
3. `con_opening`：反方开篇陈述。
4. `pro_rebuttal`：正方回应反方质疑。
5. `con_rebuttal`：反方回应正方论点。
6. `moderator_midpoint`：主持人中场总结共识、分歧和收束方向。
7. `pro_closing`：正方总结。
8. `con_closing`：反方总结。
9. `judge_report`：裁判输出最终结构化报告。

V2 起，辩论创建接口不再同步等待完整 9 阶段完成。后端创建 `debates` 记录后立即返回，并通过 FastAPI `BackgroundTasks` 在后台执行辩论。每个阶段完成后立即写入 `agent_messages`，前端通过轮询辩论详情接口展示逐步出现的 Agent 输出。

快速话题辩论使用 5 阶段：

1. `moderator_opening`：主持人定义话题边界、辩题和讨论规则。
2. `pro_opening`：正方提出支持观点。
3. `con_opening`：反方提出质疑观点。
4. `moderator_midpoint`：主持人总结双方交锋和关键分歧。
5. `judge_report`：裁判给出结论、可信度和后续思考问题。

后端通过 `article_payload["debate_mode"]` 分流。普通文章为 `article`，话题文章为 `topic`。话题文章由 `POST /api/topic-debates` 创建，内部字段约定为：

- `Article.title`：话题。
- `Article.source`：`topic`。
- `Article.content`：背景说明；如果未提供背景说明，则使用话题本身。
- `Article.user_question`：关注问题。

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

## V2 前端页面

V2 新增文章库与辩论过程可视化：

- `/articles`：文章列表，展示文章、来源、创建时间、关联辩论数量和最近辩论摘要。
- `/articles/{articleId}`：文章详情，展示正文、关注问题、关联辩论列表，并支持基于文章再次创建辩论。
- `/debates/topic/new`：快速话题辩论创建页，输入话题、可选背景说明和关注问题。
- `/debates/{debateId}`：辩论详情，文章辩论展示 9 阶段进度，话题辩论展示 5 阶段进度，并展示 Agent 输出、Agent 筛选、消息折叠/展开和最终裁判报告。

前端通过 `frontend/lib/api.ts` 统一访问后端 API，通过 `frontend/lib/types.ts` 维护接口类型。

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
