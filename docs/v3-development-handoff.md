# V3 开发交接文档

本文档用于在后续新开对话时快速恢复 `multi_agent_debate` 项目的第三阶段开发上下文。V3 基于 V2 的文章库、快速话题辩论、后台执行和过程可视化继续开发，完成产品化首页、轻量配置、结构化 Agent 输出、失败重跑、Markdown 导出、详情页可视化、文章库与最近辩论体验升级。

## 项目定位

`multi_agent_debate` 是一个本地文本辩论助手。V3 后继续支持两类辩论：

- 文章辩论：围绕用户提交的文章，执行完整 9 阶段分析，适合严肃审读文章主张、证据强弱和可信度。
- 快速话题辩论：围绕用户输入的话题，执行 5 阶段标准讨论或 3 阶段极简讨论，适合快速比较正反方观点。

V3 重点不是扩展成复杂平台，而是完成产品化闭环：用户知道怎么开始，过程看得懂，结果能导出，失败能重跑，Agent 输出更稳定、更适合可视化。

V3 仍是本地运行版本，不包含用户登录、权限、多用户隔离、联网搜索、PDF/OCR、多模态输入或生产级任务队列。

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

## V3 功能范围

后端已完成：

- `debates` 增加轻量配置：
  - `debate_depth`: `quick | standard | deep`
  - `output_style`: `concise | detailed`
  - `stage_mode`: `article_9 | topic_5 | topic_3`
- 文章辩论默认配置：`standard / detailed / article_9`
- 话题辩论默认配置：`standard / concise / topic_5`
- 话题辩论支持 `topic_3` 和 `topic_5`，文章辩论只支持 `article_9`
- `_article_payload()` 注入 `debate_depth`、`output_style`、`stage_mode`
- 轻量 SQLite 迁移：`init_db()` 自动补充 V3 配置列
- 迁移脚本会把旧库中的枚举名值转换为枚举 value，例如 `COMPLETED -> completed`、`CON_OPENING -> con_opening`
- SQLModel 枚举列显式按 enum value 存取，避免旧库小写配置值触发 SQLAlchemy Enum 读取错误
- 新增失败辩论整场重跑 API：`POST /api/debates/{debate_id}/rerun`
- 重跑只允许 `status == failed` 的辩论；其他状态返回 `409 Conflict`
- 重跑会清理旧阶段消息、旧裁判结果、错误信息和旧主张字段，然后复用后台任务从第一阶段重新执行
- Agent 输出 schema 增强：
  - 通用字段：`summary`、`key_points`、`content`
  - 正反方字段：`strongest_claim`、`supporting_reasons`、`weaknesses`、`evidence_assessment`
  - 主持人字段：`debate_focus`、`disagreement_map`
  - 裁判字段：`verdict`、`decision_basis`、`credibility_score`、`winner`
- `winner` 支持新值 `balanced`，并兼容历史 `mixed`
- 文章辩论和话题辩论 prompt 已更新为 V3 结构化输出要求
- 后端测试扩展到 71 个用例

前端已完成：

- 首页产品化重构：
  - 首屏展示项目名称、简介、两个主入口：开始文章辩论、快速话题辩论
  - 右侧工作台显示辩论总数、进行中、已完成
  - 工作台左下角保留：进入文章库、搜索历史辩论
  - 新手路径增加自动轮巡强调动画和 hover 强调
  - 示例问题区域增加推荐标签和快速预填入口
- 最近辩论独立页面：`/debates`
  - 支持搜索标题、文章编号、状态、结论
  - 支持按状态筛选
  - 支持按创建时间和可信度排序
- 文章库体验升级：
  - 普通文章 / 话题筛选
  - 标题、来源、关注问题搜索
  - 创建时间、最近辩论时间、最近可信度排序
  - 卡片展示类型、关联辩论数量、最近状态、最近结论、最近可信度
- 创建表单增加轻量配置：
  - 文章辩论：辩论深度、输出风格
  - 话题辩论：辩论深度、输出风格、3 阶段 / 5 阶段
- 首页示例话题会通过 URL query 预填快速话题辩论表单
- 辩论详情页增强：
  - 顶部摘要区
  - 总览 / 完整过程 / 裁判报告视图切换
  - 文章 9 阶段、话题 5 阶段、话题 3 阶段进度展示
  - 争议点矩阵展示
  - 失败状态下显示整场重新运行入口
- Markdown 报告导出：
  - 详情页支持导出 `.md`
  - 支持复制 Markdown
  - 报告包含基本信息、原文/话题背景、关注问题、裁判结论、可信度、正反方关键观点、关键分歧、阶段记录
  - 报告不包含继续追问环节
- 中文化修复：
  - `pro/con/mixed/balanced` 等枚举值显示为中文
  - `Evidence From Article`、`Key Objections`、`Known Limits` 等模型输出字段显示为中文
  - Agent 名称如 `ProAgent`、`ConAgent` 显示为中文角色 Agent

## 关键目录

```text
backend/app/api/          FastAPI 路由，V3 增加 debates rerun 接口
backend/app/agents/       Agent 封装与 DebateOrchestrator，支持 article/topic/topic_3 分流
backend/app/models/       SQLModel 数据表与枚举，V3 增加辩论配置字段
backend/app/prompts/      文章辩论和话题辩论 prompt，已增强结构化输出
backend/app/schemas/      API schema 和 Agent 输出 schema
backend/app/services/     文章和辩论服务层，包含配置解析、重跑、payload 注入
backend/tests/            后端测试，V3 扩展到 71 个用例
frontend/app/             Next.js 页面，V3 新增 /debates
frontend/components/      前端展示组件，新增详情页可视化和报告导出组件
frontend/lib/             API client、类型、Markdown 报告生成
docs/                     架构、API、计划和交接文档
```

## 核心流程

### 文章辩论

1. 前端在 `/debates/new` 提交文章表单，并选择辩论深度和输出风格。
2. `POST /api/articles` 创建文章。
3. `POST /api/debates` 创建辩论，并保存：
   - `debate_depth`
   - `output_style`
   - `stage_mode = article_9`
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

1. 前端在 `/debates/topic/new` 提交话题，并选择辩论深度、输出风格和阶段模式。
2. `POST /api/topic-debates` 创建特殊文章：
   - `title = topic`
   - `source = "topic"`
   - `content = background || topic`
   - `user_question = user_question`
3. 后端创建辩论并保存配置。
4. `DebateOrchestrator` 检测 `debate_mode = "topic"`。
5. `stage_mode = topic_5` 时执行 5 阶段：
   - moderator_opening
   - pro_opening
   - con_opening
   - moderator_midpoint
   - judge_report
6. `stage_mode = topic_3` 时执行 3 阶段：
   - moderator_opening
   - moderator_midpoint
   - judge_report
7. 前端详情页根据 `stage_mode` 展示 3 阶段或 5 阶段进度。

### 失败重跑

1. 辩论详情页仅在 `status === "failed"` 时显示“重新运行整场辩论”。
2. 前端调用 `POST /api/debates/{debate_id}/rerun`。
3. 后端校验辩论存在且状态为 `failed`。
4. 后端删除旧 `agent_messages`，清空旧裁判结果和错误信息。
5. 后端将辩论状态置为 `pending`，并通过后台任务重新执行整场辩论。
6. 文章辩论和话题辩论会按原 `stage_mode` 重新运行。

## 重要实现细节

- `backend/app/models/debate.py` 中 V3 枚举列使用 `enum_value_column()`，确保数据库持久化值为 enum value，而不是 enum name。
- `backend/app/models/agent_message.py` 的 `stage` 也使用 enum value 存取。
- `backend/app/db.py` 的 `_migrate_sqlite_debates_config()` 会：
  - 自动补充 `debate_depth`、`output_style`、`stage_mode`
  - 修正旧 `debates.status` 大写枚举名
  - 修正旧 `agent_messages.stage` 大写枚举名
  - 根据 `articles.source = "topic"` 修正旧话题辩论为 `concise/topic_5`
- `backend/app/services/debate_service.py` 负责：
  - 创建辩论时解析配置
  - 校验文章辩论和话题辩论允许的 `stage_mode`
  - 重跑辩论
  - 将配置注入 Agent payload
- `backend/app/agents/orchestrator.py` 根据 `debate_mode` 和 `stage_mode` 决定 9 / 5 / 3 阶段流程。
- Agent 输出 schema 使用兼容策略，历史字段仍可读取。
- 前端 `frontend/lib/report.ts` 在生成 Markdown 时会过滤 `follow_up_questions` 等继续追问字段。
- 前端 `frontend/components/agent-message-card.tsx` 和 `frontend/lib/report.ts` 维护字段中文映射，避免模型输出 key 直接显示英文。
- 首页中的最近辩论列表已迁移到 `/debates`，首页只保留启动入口、工作台统计、新手路径和示例入口。

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
- 前端首页：`http://localhost:3000`
- 文章库：`http://localhost:3000/articles`
- 最近辩论：`http://localhost:3000/debates`
- 新建文章辩论：`http://localhost:3000/debates/new`
- 快速话题辩论：`http://localhost:3000/debates/topic/new`

## 测试与验证

后端：

```powershell
cd E:\Codexproject\multi_agent_debate
$env:PYTHONPATH='E:\Codexproject\multi_agent_debate\backend'
E:\Anaconda\envs\multi_agents_debate\python.exe -m pytest backend\tests
```

V3 最近一次验证结果：

```text
71 passed, 2 warnings
```

两个 warning 为 Starlette TestClient/httpx 提醒和 `.pytest_cache` 权限提示，不影响 V3 功能。

前端：

```powershell
cd E:\Codexproject\multi_agent_debate\frontend
npm run lint
npm run build
```

V3 最近一次验证结果：

```text
lint passed
build passed
```

## 第三版归档备注

建议第三次 Git 提交信息：

```text
feat: archive v3 productized debate workflow
```

归档摘要：

- 增加 V3 开发计划和交接文档。
- 增加辩论轻量配置：深度、输出风格、阶段模式。
- 支持话题辩论 3 阶段极简模式。
- 增强 Agent 输出 schema 和 prompt，使其支持摘要、关键点、最强论点、争议点矩阵和裁判依据。
- 增加失败辩论整场重新运行接口和前端入口，仅允许 failed 状态重跑。
- 增加 Markdown 导出和复制。
- 增强辩论详情页可视化：摘要区、视图切换、争议点矩阵、结构化字段展示。
- 首页产品化，增加工作台统计、新手路径动画和示例话题入口。
- 最近辩论迁移到独立 `/debates` 页面，支持搜索、筛选和排序。
- 文章库增强筛选、搜索、排序和卡片信息密度。
- 修复旧 SQLite 枚举值迁移兼容问题。
- 前端中文化模型输出字段和枚举值。
- 后端测试扩展到 71 个用例，前端 lint/build 通过。

## Git 归档命令

当前环境可使用用户指定的 Git 路径 `E:\Git`，在项目根目录执行：

```powershell
cd E:\Codexproject\multi_agent_debate
& 'E:\Git\cmd\git.exe' status
& 'E:\Git\cmd\git.exe' add .
& 'E:\Git\cmd\git.exe' commit -m "feat: archive v3 productized debate workflow"
& 'E:\Git\cmd\git.exe' status
```

## 后续开发建议

- 增加真实 LLM 调用耗时、错误类型和成本提示。
- 增加 Markdown 报告模板设置，例如简版/完整版。
- 增加文章编辑功能。
- 增加按辩论配置筛选历史辩论，例如 3 阶段、5 阶段、9 阶段。
- 如果后续继续扩展数据模型，建议正式引入 Alembic，而不是继续增加轻量 SQLite 补列迁移。
- 增加前端端到端测试或截图回归，避免首页与详情页视觉调整反复回退。
