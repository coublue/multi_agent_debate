# V2 开发交接文档

本文档用于在后续新开对话时快速恢复 `multi_agent_debate` 项目的第二版开发上下文。V2 基于 V1 本地 MVP，完成文章资源管理、后台辩论执行、过程可视化、Agent 发言筛选折叠，以及快速话题辩论。

## 项目定位

`multi_agent_debate` 是一个本地文本辩论助手。V2 后支持两类辩论：

- 文章辩论：围绕用户提交的文章，执行完整 9 阶段分析，适合严肃审读文章主张。
- 快速话题辩论：围绕用户输入的话题，执行 5 阶段轻量讨论，适合快速比较正反方观点。

V2 仍是本地运行版本，不包含用户登录、权限、多用户隔离、联网搜索、PDF/OCR、多模态输入或生产级任务队列。

## 模型接入约定

涉及 LLM API、模型接入或 Agent 底层模型配置时，默认使用 DeepSeek OpenAI-compatible 方案：

- API key：只从环境变量 `DEEPSEEK_API_KEY` 读取
- Base URL：`https://api.deepseek.com`
- 默认模型：`deepseek-v4-pro`
- Python SDK：`openai.AsyncOpenAI`

如果项目使用 LangChain，默认使用 `langchain_openai.ChatOpenAI` 接入。不要把真实 key 写入项目文件、测试、提交记录或文档。

## 技术栈

- 后端：FastAPI、SQLModel、SQLite、Pydantic v2、pydantic-settings、OpenAI-compatible SDK、pytest
- 前端：Next.js 15、React 19、TypeScript、Tailwind CSS、ESLint
- 数据库：默认本地 SQLite，文件名 `debate_assistant.db`

## V2 功能范围

后端已完成：

- 文章列表增强：返回关联辩论数量和最近辩论摘要
- 文章详情 API
- 文章关联辩论列表 API：`GET /api/articles/{article_id}/debates`
- 删除文章 API：`DELETE /api/articles/{article_id}`
- 删除文章时级联删除该文章下的 `debates` 和 `agent_messages`
- 删除单场辩论时仍不删除文章
- 辩论创建改为后台执行：`POST /api/debates` 创建后立即返回
- 阶段输出逐步落库到 `agent_messages`
- Agent 输出非法 JSON 时自动进行一次 JSON 修复重试
- 快速话题辩论 API：`POST /api/topic-debates`
- 话题辩论内部创建特殊文章记录，`source = "topic"`
- 文章辩论保持 9 阶段
- 话题辩论使用 5 阶段
- 话题辩论使用专门轻量 prompt，不再套用文章审查话术
- 后端测试覆盖文章管理、后台执行、话题辩论 API、话题 5 阶段编排和 prompt 切换

前端已完成：

- 文章库页面：`/articles`
- 文章详情页面：`/articles/{articleId}`
- 从已有文章再次创建辩论
- 删除文章，并提示会同时删除该文章下所有辩论记录
- 快速话题辩论创建页：`/debates/topic/new`
- 话题表单字段：话题、背景说明、关注问题
- 首页和文章辩论创建页增加快速话题辩论入口
- 辩论详情页轮询展示逐步生成的 Agent 输出
- 文章辩论显示 9 阶段进度
- 话题辩论显示 5 阶段进度
- 详情页识别 `article.source === "topic"` 并显示“话题辩论”
- 话题辩论正文区域显示为“话题背景”
- Agent 发言支持按主持人、正方、反方、裁判筛选
- Agent 消息支持折叠/展开和角色高亮

## 关键目录

```text
backend/app/api/          FastAPI 路由，新增 topic_debates.py
backend/app/agents/       Agent 封装与 DebateOrchestrator，支持 article/topic 分流
backend/app/models/       SQLModel 数据表与枚举
backend/app/prompts/      文章辩论和话题辩论 prompt
backend/app/schemas/      API schema，包含 TopicDebateCreate
backend/app/services/     文章和辩论服务层
backend/tests/            后端测试
frontend/app/             Next.js 页面
frontend/components/      前端展示组件
frontend/lib/             API client 与类型
docs/                     架构、API、计划和交接文档
```

## 核心流程

### 文章辩论

1. 前端提交文章表单或从文章详情页选择已有文章。
2. `POST /api/articles` 创建文章，或直接使用已有 `article_id`。
3. `POST /api/debates` 创建辩论并立即返回。
4. FastAPI `BackgroundTasks` 调用后台辩论执行。
5. `DebateOrchestrator` 检测 `debate_mode = "article"`，执行 9 阶段：
   - moderator_opening
   - pro_opening
   - con_opening
   - pro_rebuttal
   - con_rebuttal
   - moderator_midpoint
   - pro_closing
   - con_closing
   - judge_report
6. 每个阶段完成后立即保存到 `agent_messages`。
7. 最终裁判报告保存到 `debates.final_report`，并更新 status、winner、credibility_score。
8. 前端详情页轮询 `GET /api/debates/{debate_id}` 展示过程和结果。

### 快速话题辩论

1. 前端在 `/debates/topic/new` 提交话题。
2. `POST /api/topic-debates` 创建特殊文章：
   - `title = topic`
   - `source = "topic"`
   - `content = background || topic`
   - `user_question = user_question`
3. 后端创建辩论并立即返回。
4. `DebateOrchestrator` 检测 `debate_mode = "topic"`，执行 5 阶段：
   - moderator_opening
   - pro_opening
   - con_opening
   - moderator_midpoint
   - judge_report
5. 话题辩论使用 `topic_*.txt` prompt，输出简洁正反观点，不做文章证据审查。
6. 前端详情页识别 `source = "topic"`，只展示 5 阶段进度和消息。

## 重要实现细节

- `backend/app/services/debate_service.py` 中 `_article_payload()` 会根据 `article.source == "topic"` 注入：
  - `debate_mode = "topic"`
  - `topic`
  - `background`
- `backend/app/agents/orchestrator.py` 中 `run_iter()` 根据 `article_payload["debate_mode"]` 分流到文章辩论或话题辩论。
- `backend/app/agents/base.py` 在 JSON 解析失败时会用一次修复 prompt 重试，减少真实模型偶发格式错误导致的中断。
- 话题辩论 prompt 文件包括：
  - `topic_moderator_opening.txt`
  - `topic_pro_opening.txt`
  - `topic_con_opening.txt`
  - `topic_moderator_midpoint.txt`
  - `topic_judge.txt`
- 话题辩论不新增数据表，优先通过 `articles.source = "topic"` 标记。
- 文章库会看到话题记录；前端应标记为话题，避免和普通文章混淆。
- 删除文章会删除其所有辩论和阶段消息；删除辩论不删除文章。

## 本地运行

后端：

```powershell
cd E:\Codexproject\multi_agent_debate
E:\Anaconda\envs\multi_agents_debate\python.exe -m uvicorn app.main:app --app-dir backend --reload
```

前端：

```powershell
cd E:\Codexproject\multi_agent_debate\frontend
npm run dev
```

访问：

- 后端健康检查：`http://127.0.0.1:8000/api/health`
- 后端 OpenAPI：`http://127.0.0.1:8000/docs`
- 前端：`http://localhost:3000`
- 文章库：`http://localhost:3000/articles`
- 快速话题辩论：`http://localhost:3000/debates/topic/new`

## 测试与验证

后端：

```powershell
cd E:\Codexproject\multi_agent_debate
$env:PYTHONPATH='E:\Codexproject\multi_agent_debate\backend'
E:\Anaconda\envs\multi_agents_debate\python.exe -m pytest backend\tests
```

V2 最近一次验证结果：

```text
56 passed, 2 warnings
```

两个 warning 为 Starlette TestClient/httpx 提醒和 `.pytest_cache` 权限提示，不影响 V2 功能。

前端：

```powershell
cd E:\Codexproject\multi_agent_debate\frontend
npm run lint
npm run build
```

V2 最近一次验证结果：

```text
lint passed
build passed
```

## 第二版归档备注

建议第二次 Git 提交信息：

```text
feat: archive v2 article library and topic debate
```

归档摘要：

- 增加文章库、文章详情、文章删除和文章关联辩论查看。
- 删除辩论不影响文章；删除文章会清理关联辩论和阶段消息。
- 辩论创建改为后台执行，阶段消息逐步落库并可视化展示。
- 增加 Agent 发言筛选、折叠和角色高亮。
- 增加快速话题辩论入口，支持 5 阶段轻量正反观点讨论。
- 增加话题辩论专用 prompt，避免套用文章证据审查话术。
- 增加 Agent JSON 输出修复重试，降低格式错误导致的中断。
- 后端测试扩展到 56 个用例，前端 lint/build 通过。

## Git 归档命令

如果当前环境能使用 `git`，在项目根目录执行：

```powershell
cd E:\Codexproject\multi_agent_debate
git status
git add .
git commit -m "feat: archive v2 article library and topic debate"
git status
```

当前 Codex PowerShell 环境此前没有找到可执行的 `git` 命令；如果仍然不可用，需要安装 Git 或把 Git 加入 PATH 后再执行以上命令。

## 后续开发建议

- 给文章库增加“普通文章 / 话题”筛选。
- 给失败辩论增加重新运行功能。
- 给话题辩论增加可选 3 阶段极简模式。
- 增加导出 Markdown / PDF 报告。
- 增加真实 LLM 调用耗时、错误和成本提示。
- 如果后续需要更严格的数据模型，可引入 `debate_type` 或 `article_kind` 字段，并配合 Alembic 迁移。
