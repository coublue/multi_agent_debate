# 4 Agent 文章辩论助手开发计划

## 项目目标

构建一个本地文本型 multi-agent 辩论应用。

用户粘贴一篇文章、新闻、评论或观点稿后，系统启动 4 个 Agent：主持人、正方、反方、裁判。多个 Agent 围绕文章核心主张进行多轮辩论，互相回应、反驳和总结，最后输出一份结构化的审议报告，帮助用户判断文章观点是否可靠、论证是否充分、哪些地方需要继续查证。

第一版不做联网、不做 PDF、不做图片或视频分析，也不依赖多模态能力。模型默认使用 DeepSeek OpenAI-compatible 方案。

---

## 一、产品定位

这个项目不是普通文章总结器，而是一个“观点审议室”：

- 用户输入一篇文章。
- 主持人 Agent 提取核心主张和辩题。
- 正方 Agent 尽力支持文章观点。
- 反方 Agent 尽力质疑文章观点。
- 主持人 Agent 在中场压缩分歧，降低上下文压力。
- 正反方进行总结陈词。
- 裁判 Agent 给出最终判断和可信度评分。

核心体验是让用户看到观点被不同立场拆解，而不是只得到单一总结。

---

## 二、MVP 功能范围

第一版只做完整的本地多 Agent 辩论闭环。

### 1. 文章输入

支持用户手动输入：

- 标题。
- 文章来源，可选。
- 正文内容。
- 用户关心的问题，可选。

第一版只支持纯文本，不支持：

- PDF 上传。
- 图片识别。
- 视频识别。
- 联网抓取新闻。
- 自动事实核查。

### 2. 创建辩论

用户提交文章后，系统创建一场辩论任务。

需要保存：

- 原始文章。
- 辩论状态。
- 当前辩论阶段。
- 每个 Agent 的发言。
- 最终裁判报告。

### 3. 4 Agent 辩论

保留 4 个 Agent：

- `Moderator Agent`：主持人。
- `Pro Agent`：正方。
- `Con Agent`：反方。
- `Judge Agent`：裁判。

这 4 个 Agent 不是简单的顺序摘要工具。正方和反方会读取对方前一轮发言，并针对对方观点进行回应。主持人负责提炼议题和压缩分歧，裁判负责基于完整辩论过程输出最终判断。

### 4. 三轮辩论流程

推荐第一版固定使用 3 轮感的辩论流程：

```text
1. 主持人开场：提取文章核心主张、争议点和辩题
2. 正方立论：支持文章观点，提出最强论据
3. 反方立论：质疑文章观点，提出最强反驳
4. 正方反驳：回应反方第一轮质疑
5. 反方反驳：回应正方第一轮论证和第二轮回应
6. 主持人中场总结：压缩双方分歧和关键争点
7. 正方总结陈词：基于中场总结做最后辩护
8. 反方总结陈词：基于中场总结做最后质疑
9. 裁判最终报告：判断论证强弱、可信度和后续查证方向
```

这样一共 9 次 LLM 调用。相比 2 轮交锋，成本和耗时略增，但辩论感更强。

### 5. 辩论过程展示

前端需要按阶段展示：

- 原文信息。
- 主持人开场。
- 正方立论。
- 反方立论。
- 正方反驳。
- 反方反驳。
- 主持人中场总结。
- 正方总结陈词。
- 反方总结陈词。
- 裁判最终报告。

### 6. 历史记录

第一版支持查看最近辩论记录。

可以先做简单列表：

- 标题。
- 创建时间。
- 状态。
- 可信度评分。
- 点击进入详情页。

---

## 三、Agent 角色设计

### 1. Moderator Agent

职责：

- 阅读文章。
- 提取文章核心主张。
- 识别关键事实、观点和推断。
- 提炼争议点。
- 生成辩题。
- 约束正反方围绕原文发言。
- 在中场总结双方分歧，压缩上下文。

开场输出建议：

```json
{
  "main_claim": "文章核心主张",
  "debate_topic": "本场辩论题目",
  "key_points": ["文章中的关键论点"],
  "controversial_points": ["可能存在争议的地方"],
  "rules": ["正反方需要遵守的辩论规则"]
}
```

中场总结输出建议：

```json
{
  "pro_summary": "正方目前最强论点",
  "con_summary": "反方目前最强论点",
  "key_disagreements": ["双方关键分歧"],
  "unresolved_questions": ["尚未解决的问题"],
  "focus_for_closing": "总结陈词需要聚焦的问题"
}
```

### 2. Pro Agent

职责：

- 支持文章核心观点。
- 从原文中寻找最有力论据。
- 为作者结论做合理辩护。
- 回应反方质疑。
- 在总结陈词中说明为什么文章观点仍然成立。

限制：

- 不能编造外部事实。
- 不能假装已经联网核查。
- 必须尽量基于原文内容发言。

### 3. Con Agent

职责：

- 质疑文章核心观点。
- 找出逻辑漏洞、证据不足、过度推断。
- 指出文章可能忽略的另一面。
- 回应正方辩护。
- 在总结陈词中说明为什么文章观点需要被谨慎看待。

限制：

- 不能编造外部事实。
- 不能假装已经联网核查。
- 重点是批判论证质量，而不是做事实核查。

### 4. Judge Agent

职责：

- 阅读原文、主持人总结和正反方发言。
- 总结双方最强论点。
- 判断哪一方论证更充分。
- 区分文章中较可信和较存疑的部分。
- 给出可信度评分。
- 给出读者后续查证建议。

最终输出建议：

```json
{
  "main_claim": "文章核心主张",
  "pro_strongest_points": ["正方最强论点"],
  "con_strongest_points": ["反方最强论点"],
  "key_disagreements": ["关键分歧"],
  "winner": "pro | con | mixed",
  "credibility_score": 0,
  "credible_parts": ["较可信部分"],
  "questionable_parts": ["存疑部分"],
  "follow_up_questions": ["后续应查证的问题"],
  "final_summary": "给用户的最终阅读建议"
}
```

---

## 四、上下文与成本控制

三轮辩论不会明显增加服务器内存负担，但会增加：

- LLM 调用次数。
- token 消耗。
- 响应时间。
- 上下文长度压力。

控制策略：

- 第一版固定 9 次调用，不允许用户自定义无限轮次。
- 原文过长时先截取或压缩到 `MAX_ARTICLE_CHARS`。
- 正反方每轮发言限制最大长度。
- 主持人中场总结负责压缩前两轮分歧。
- 总结陈词阶段不要传入完整历史，只传入原文摘要、辩题、中场总结和对方最强观点。
- 裁判阶段传入必要发言和中场总结，不传无关调试信息。

推荐配置：

```env
MAX_ARTICLE_CHARS=12000
MAX_AGENT_OUTPUT_CHARS=2500
DEBATE_ROUNDS=3
```

---

## 五、技术栈

### 1. 后端

- Web 框架：`FastAPI`
- ASGI 服务器：`uvicorn`
- 数据库：`SQLite`
- ORM：`SQLModel`
- 数据校验：`Pydantic`
- 配置管理：`pydantic-settings`
- HTTP 客户端：`httpx`
- 测试：`pytest`

### 2. LLM 接入

默认使用 DeepSeek OpenAI-compatible 方案：

- 环境变量：`DEEPSEEK_API_KEY`
- Base URL：`https://api.deepseek.com`
- 默认模型：`deepseek-v4-pro`

如果项目使用 LangChain，默认使用：

- `langchain_openai.ChatOpenAI`

建议第一版封装自己的 `llm.py`：

- 统一读取模型配置。
- 统一调用 chat completions。
- 统一处理超时、错误、JSON 解析失败。
- 业务代码不要直接调用模型 API。

### 3. 前端

- 框架：`Next.js`
- 语言：`TypeScript`
- 样式：`Tailwind CSS`
- 请求封装：`fetch` + `lib/api.ts`

第一版不需要复杂状态管理库。

### 4. 暂不使用的技术

第一版不使用：

- 向量数据库。
- embedding。
- OCR。
- PDF 解析。
- 多模态模型。
- 联网搜索。
- 复杂 Agent 框架。

---

## 六、推荐项目结构

```text
paper_assistant/
  frontend/
    app/
      page.tsx
      debates/
        new/
          page.tsx
        [debateId]/
          page.tsx
    components/
      article-form.tsx
      debate-list.tsx
      debate-stage.tsx
      agent-message-card.tsx
      judge-report.tsx
      debate-status.tsx
    lib/
      api.ts
      types.ts
    package.json

  backend/
    app/
      main.py
      config.py
      db.py
      llm.py

      api/
        health.py
        articles.py
        debates.py

      models/
        article.py
        debate.py
        agent_message.py

      schemas/
        article.py
        debate.py
        agent_outputs.py

      services/
        article_service.py
        debate_service.py

      agents/
        base.py
        moderator.py
        pro.py
        con.py
        judge.py
        orchestrator.py

      prompts/
        moderator_opening.txt
        moderator_midpoint.txt
        pro_opening.txt
        pro_rebuttal.txt
        pro_closing.txt
        con_opening.txt
        con_rebuttal.txt
        con_closing.txt
        judge.txt

    tests/
      test_health.py
      test_article_create.py
      test_debate_schemas.py
      test_orchestrator_flow.py

    requirements.txt

  docs/
    api-spec.md
    architecture.md

  .env.example
  README.md
```

---

## 七、后端模块职责

### 1. `api`

- `health.py`：服务健康检查。
- `articles.py`：文章创建和查询。
- `debates.py`：创建辩论、查询辩论详情、查询辩论列表。

### 2. `services`

- `article_service.py`：保存文章、查询文章。
- `debate_service.py`：创建辩论任务、调用 orchestrator、保存 Agent 发言和最终报告。

### 3. `agents`

- `base.py`：Agent 基类，统一 LLM 调用、JSON 解析、错误处理。
- `moderator.py`：主持人 Agent。
- `pro.py`：正方 Agent。
- `con.py`：反方 Agent。
- `judge.py`：裁判 Agent。
- `orchestrator.py`：固定流程调度 9 个阶段。

### 4. `schemas`

- API 请求响应 schema。
- Agent 输出 schema。
- 裁判报告 schema。

### 5. `prompts`

- 每个阶段单独 prompt 文件。
- 方便后续调试角色风格和输出结构。

---

## 八、数据结构

### 1. `articles`

保存用户输入的文章。

```text
id
title
source
content
user_question
created_at
updated_at
```

### 2. `debates`

保存一次辩论任务。

```text
id
article_id
status
main_claim
debate_topic
final_report
winner
credibility_score
error_message
created_at
updated_at
```

### 3. `agent_messages`

保存每个 Agent 在每个阶段的发言。

```text
id
debate_id
agent_name
agent_role
round_index
stage
message_type
content
target_agent
created_at
```

`stage` 建议值：

```text
moderator_opening
pro_opening
con_opening
pro_rebuttal
con_rebuttal
moderator_midpoint
pro_closing
con_closing
judge_report
```

`status` 建议值：

```text
pending
running
completed
failed
```

---

## 九、API 设计

### 1. 健康检查

```http
GET /api/health
```

### 2. 创建文章

```http
POST /api/articles
```

请求：

```json
{
  "title": "文章标题",
  "source": "文章来源，可选",
  "content": "文章正文",
  "user_question": "我最关心的问题，可选"
}
```

### 3. 获取文章详情

```http
GET /api/articles/{article_id}
```

### 4. 创建辩论

```http
POST /api/debates
```

请求：

```json
{
  "article_id": 1
}
```

行为：

- 创建辩论记录。
- 启动 4 Agent 辩论流程。
- 保存每个阶段的 Agent 发言。
- 保存最终裁判报告。

### 5. 获取辩论列表

```http
GET /api/debates
```

### 6. 获取辩论详情

```http
GET /api/debates/{debate_id}
```

返回：

```json
{
  "id": 1,
  "status": "completed",
  "article": {},
  "messages": [],
  "final_report": {},
  "winner": "mixed",
  "credibility_score": 72
}
```

---

## 十、前端页面

### 1. 首页 `/`

功能：

- 产品说明。
- 新建辩论入口。
- 最近辩论列表。

### 2. 新建辩论页 `/debates/new`

功能：

- 输入标题。
- 输入来源，可选。
- 粘贴文章正文。
- 输入用户关心的问题，可选。
- 点击“开始辩论”。

### 3. 辩论详情页 `/debates/[debateId]`

功能：

- 显示文章标题和正文。
- 显示辩论状态。
- 按阶段展示 Agent 发言。
- 突出正方、反方、主持人、裁判的不同角色。
- 展示裁判最终报告。

---

## 十一、环境变量

`.env.example` 建议：

```env
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-pro

DATABASE_URL=sqlite:///./debate_assistant.db

MAX_ARTICLE_CHARS=12000
MAX_AGENT_OUTPUT_CHARS=2500
DEBATE_ROUNDS=3
LLM_TIMEOUT_SECONDS=120
```

---

## 十二、依赖建议

`backend/requirements.txt` 第一版建议：

```text
fastapi
uvicorn[standard]
sqlmodel
pydantic
pydantic-settings
httpx
pytest
```

如果使用 LangChain：

```text
langchain-openai
```

前端依赖按 Next.js 初始化即可：

```text
next
react
react-dom
typescript
tailwindcss
```

---

## 十三、开发优先级

建议按下面顺序开发：

1. 初始化后端 `FastAPI` 项目。
2. 配置 `.env` 和 DeepSeek OpenAI-compatible 客户端。
3. 建立 SQLite + SQLModel 数据表。
4. 实现文章创建和查询 API。
5. 定义 Agent 输出 Pydantic schema。
6. 实现 `BaseAgent`，支持 prompt 加载、LLM 调用、JSON 解析和错误处理。
7. 实现 `Moderator Agent` 开场。
8. 实现 `Pro Agent` 立论。
9. 实现 `Con Agent` 立论。
10. 实现正反方反驳阶段。
11. 实现 `Moderator Agent` 中场总结。
12. 实现正反方总结陈词。
13. 实现 `Judge Agent` 最终报告。
14. 实现 `DebateOrchestrator` 串联完整 9 阶段流程。
15. 实现辩论创建和详情 API。
16. 初始化前端 `Next.js` 项目。
17. 实现首页和新建辩论页。
18. 实现辩论详情页。
19. 增加基础测试和演示样例。

---

## 十四、MVP 完成标准

第一版达到下面条件即可：

- 用户能粘贴一篇文章并创建辩论。
- 系统能保存文章和辩论记录。
- 主持人能提取文章核心主张和辩题。
- 正方和反方能基于原文进行立论。
- 正方和反方能读取对方发言并进行反驳。
- 主持人能做中场分歧总结。
- 正方和反方能做总结陈词。
- 裁判能输出最终报告、胜方判断和可信度评分。
- 前端能按阶段展示完整辩论过程。

---

## 十五、第一版不建议做的内容

为了控制范围，第一版不要做：

- 联网新闻抓取。
- 自动事实核查。
- PDF 上传。
- OCR。
- 图片、视频、音频分析。
- 多模态输入。
- 用户登录注册。
- 多用户权限。
- 自定义 Agent 数量。
- 无限轮辩论。
- 复杂 Agent 框架。
- 向量数据库。

---

## 十六、一句话总结

这个项目第一版的核心是：

用户粘贴一篇文章，`Moderator Agent` 设定辩题，`Pro Agent` 和 `Con Agent` 进行三轮感的正反交锋，`Judge Agent` 输出最终审议报告。

这样既是真正有互动关系的 multi-agent 应用，又能避开联网、多模态和 PDF 解析带来的额外复杂度。
