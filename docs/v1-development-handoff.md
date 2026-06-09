# V1 开发交接文档

本文档用于在后续新开对话时快速恢复 `multi_agent_debate` 项目的第一版开发上下文。

## 项目定位

`multi_agent_debate` 是一个本地文章辩论助手。用户提交文章后，系统围绕文章主张组织 4 个 Agent 完成固定 9 阶段辩论，并输出结构化过程消息、最终裁判报告、可信度评分和结论方。

第一版目标是可本地运行的 MVP，不包含 PDF/OCR、联网搜索、用户登录、多模态输入或生产级任务队列。

## 模型接入约定

涉及 LLM API、模型接入或 Agent 底层模型配置时，默认使用 DeepSeek OpenAI-compatible 方案：

- API key：只从环境变量 `DEEPSEEK_API_KEY` 读取
- Base URL：`https://api.deepseek.com`
- 默认模型：`deepseek-v4-pro`
- Python SDK：`openai.AsyncOpenAI`

不要把真实 key 写入项目文件、测试、提交记录或文档。Windows 系统环境变量配置后，需要重启终端或 IDE 后端进程才能读取到。

## 技术栈

- 后端：FastAPI、SQLModel、SQLite、Pydantic v2、pydantic-settings、OpenAI-compatible SDK、pytest
- 前端：Next.js 15、React 19、TypeScript、Tailwind CSS、ESLint
- 数据库：默认本地 SQLite，文件名 `debate_assistant.db`

## V1 功能范围

后端已完成：

- 文章创建、读取、列表 API
- 辩论创建、读取详情、列表、删除 API
- 4 Agent 封装：Moderator、Pro、Con、Judge
- 固定 9 阶段辩论编排
- Agent prompt 模板和 JSON 输出解析
- DeepSeek OpenAI-compatible 真实调用与无 key mock fallback
- SQLite 表模型：articles、debates、agent_messages
- CORS 支持本地前端访问
- 后端测试覆盖 API、schema、orchestrator、LLM client、prompt 契约

前端已完成：

- 首页最近辩论列表
- 新建文章并启动辩论
- 辩论详情页展示文章、状态、9 阶段消息、最终裁判报告
- 删除辩论功能：首页列表删除、详情页删除并返回首页
- API client、类型定义、基础错误处理
- Tailwind 基础布局和中文界面

## 关键目录

```text
backend/app/api/          FastAPI 路由
backend/app/agents/       Agent 封装、BaseAgent、Orchestrator
backend/app/models/       SQLModel 数据表与枚举
backend/app/prompts/      9 阶段 Agent prompt
backend/app/schemas/      API 与 Agent 输出 schema
backend/app/services/     文章和辩论服务层
backend/tests/            后端测试
frontend/app/             Next.js 页面
frontend/components/      前端展示组件
frontend/lib/             API client 与类型
docs/                     架构、API、交接文档
```

## 核心流程

1. 前端提交文章表单。
2. `POST /api/articles` 创建文章。
3. `POST /api/debates` 创建辩论并同步执行辩论流程。
4. `DebateOrchestrator` 依次调用 9 个阶段：
   - moderator_opening
   - pro_opening
   - con_opening
   - pro_rebuttal
   - con_rebuttal
   - moderator_midpoint
   - pro_closing
   - con_closing
   - judge_report
5. 每个阶段输出 JSON，保存到 `agent_messages`。
6. 最终裁判报告保存到 `debates.final_report`，并同步更新 status、winner、credibility_score。
7. 前端详情页读取 `GET /api/debates/{debate_id}` 展示完整结果。

## 重要实现细节

- `backend/app/llm.py` 负责 DeepSeek OpenAI-compatible 调用。
- `backend/app/agents/base.py` 会把每轮上下文追加为 `实际输入 JSON`，确保模型能稳定看到文章和前序阶段输出。
- `backend/app/agents/con_agent.py` 避免使用 Windows 保留文件名 `con.py`。
- 删除辩论只删除 `debates` 与关联 `agent_messages`，不删除原文章。
- `.gitignore` 已忽略数据库、依赖目录、构建产物、缓存、`.env` 和 IDE 配置。

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

## 测试与验证

后端：

```powershell
cd E:\Codexproject\multi_agent_debate
$env:PYTHONPATH='E:\Codexproject\multi_agent_debate\backend'
E:\Anaconda\envs\multi_agents_debate\python.exe -m pytest backend\tests
```

V1 最近一次验证结果：

```text
41 passed, 2 warnings
```

两个 warning 为 Starlette TestClient/httpx 提醒和 `.pytest_cache` 权限提示，不影响 MVP 功能。

前端：

```powershell
cd E:\Codexproject\multi_agent_debate\frontend
npm run lint
npm run build
```

V1 最近一次验证结果：

```text
lint passed
build passed
```

## 第一版归档备注

建议第一次 Git 提交信息：

```text
chore: archive v1 multi-agent debate MVP
```

归档摘要：

- 完成本地 4 Agent 文章辩论 MVP。
- 后端具备文章、辩论、阶段消息、删除辩论等核心 API。
- 前端具备创建、列表、详情、删除的基础闭环。
- DeepSeek OpenAI-compatible 接入已按环境变量约定实现。
- 测试覆盖核心后端链路，前端 lint/build 通过。

## Git 初始化命令

当前 Codex 运行环境没有找到可执行的 `git` 命令。安装 Git 或把 Git 加入 PATH 后，在项目根目录执行：

```powershell
cd E:\Codexproject\multi_agent_debate
git init
git add .
git commit -m "chore: archive v1 multi-agent debate MVP"
git status
```

如果需要设置本仓库提交身份：

```powershell
git config user.name "你的名字"
git config user.email "你的邮箱"
```

## 第二次开发建议入口

新开对话时可以直接提供本文件，并说明要基于 V1 继续开发。建议优先级：

- 改为异步后台任务执行辩论，避免创建接口长时间阻塞。
- 增加辩论重新运行功能。
- 增加文章编辑或文章删除功能。
- 增加 Agent 输出 schema 校验与失败重试。
- 增加真实 DeepSeek 调用的成本、超时和错误提示优化。
- 增加前端加载进度、阶段刷新和更友好的失败恢复。
- 增加数据库迁移方案，例如 Alembic。
