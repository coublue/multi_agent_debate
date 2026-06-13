# Multi Agent Debate

`multi_agent_debate` 是一个本地运行的多 Agent 文本辩论助手。用户可以提交文章或输入话题，系统会组织主持人、正方、反方和裁判完成多阶段辩论，并输出结构化过程记录、争议点地图、裁判报告和可导出的 Markdown 报告。

## 前端视觉说明

V4 前端视觉参考了 Notion AI 公开页面的设计风格：黑色背景、高对比白字、深灰编辑器窗口、紫色强调、AI Assist 输入框和深色功能卡片。

本项目仅参考其视觉语言，没有复用 Notion 官方代码或插画资源。`ui material` 文件夹中的图片是本地视觉参考材料；如果准备公开上传 GitHub，建议确认这些图片是否需要保留在仓库中。

## LLM 接入约定

默认 LLM 接入遵循 DeepSeek OpenAI-compatible 方案：

- API key：只从环境变量 `DEEPSEEK_API_KEY` 读取。
- Base URL：`https://api.deepseek.com`。
- 默认模型：`deepseek-v4-pro`。
- Python SDK：使用 OpenAI-compatible Chat API。

不要把真实 API key 写入代码、文档、测试或提交记录。本仓库示例只使用占位符。

## 技术栈

- 后端：Python 3.11+、FastAPI、SQLModel、SQLite、Pydantic v2、pytest、OpenAI-compatible SDK。
- 前端：Next.js 15、React 19、TypeScript、Tailwind CSS、ESLint。
- 数据库：默认本地 SQLite，文件名 `debate_assistant.db`。

## 功能概览

- 文章辩论：围绕用户提交的文章执行 9 阶段分析。
- 话题辩论：围绕一个话题执行 5 阶段标准辩论或 3 阶段极简辩论。
- 多 Agent 角色：主持人、正方、反方、裁判。
- 过程可视化：阶段进度、Agent 筛选、结构化消息卡片。
- 争议点地图：展示正反双方关键分歧。
- 裁判报告：输出结论、可信度、判定依据、可信部分和存疑部分。
- Markdown 导出：支持复制和下载当前辩论报告。
- 失败重跑：失败辩论可整场重新运行。
- 文章库与历史辩论：支持搜索、筛选、排序和删除。

## 目录结构

```text
.
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI 路由
│   │   ├── agents/       # Agent 封装与编排
│   │   ├── models/       # SQLModel 数据表与枚举
│   │   ├── prompts/      # Agent prompt 模板
│   │   ├── schemas/      # API 请求/响应模型
│   │   ├── services/     # 文章和辩论业务服务
│   │   ├── config.py     # 环境变量与默认配置
│   │   ├── db.py         # 数据库初始化和轻量迁移
│   │   ├── llm.py        # LLM 客户端适配
│   │   └── main.py       # FastAPI 应用入口
│   ├── tests/            # 单元测试与集成契约测试
│   └── requirements.txt
├── frontend/
│   ├── app/              # Next.js App Router 页面
│   ├── components/       # 可复用前端组件
│   ├── lib/              # API client、类型、Markdown 报告生成
│   ├── package.json
│   ├── tailwind.config.ts
│   └── tsconfig.json
├── docs/
│   ├── api-spec.md
│   ├── architecture.md
│   ├── v1-development-plan.md
│   ├── v1-development-handoff.md
│   ├── v2-development-plan.md
│   ├── v2-development-handoff.md
│   ├── v3-development-plan.md
│   ├── v3-development-handoff.md
│   ├── v4-development-plan.md
│   └── v4-development-handoff.md
├── .env.example
├── pytest.ini
└── README.md
```

## 环境变量

复制 `.env.example` 为 `.env`，按需填写：

```env
DEEPSEEK_API_KEY=<your-deepseek-api-key>
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-pro
DATABASE_URL=sqlite:///./debate_assistant.db
MAX_ARTICLE_CHARS=12000
MAX_AGENT_OUTPUT_CHARS=2500
DEBATE_ROUNDS=3
LLM_TIMEOUT_SECONDS=120
```

前端可选变量：

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

## 安装依赖

后端：

```powershell
cd E:\Codexproject\multi_agent_debate
conda create -n multi_agent_debate python=3.11
conda activate multi_agent_debate
pip install -r backend\requirements.txt
```

前端：

```powershell
cd E:\Codexproject\multi_agent_debate\frontend
npm install
```

## 启动服务

后端默认启动在 `http://127.0.0.1:8000`：

```powershell
cd E:\Codexproject\multi_agent_debate
conda activate multi_agent_debate
uvicorn app.main:app --app-dir backend --reload
```

可访问：

- 健康检查：`http://127.0.0.1:8000/api/health`
- OpenAPI：`http://127.0.0.1:8000/docs`

前端默认启动在 `http://localhost:3000`：

```powershell
cd E:\Codexproject\multi_agent_debate\frontend
npm run dev
```

主要页面：

- 首页：`http://localhost:3000`
- 文章库：`http://localhost:3000/articles`
- 历史辩论：`http://localhost:3000/debates`
- 新建文章辩论：`http://localhost:3000/debates/new`
- 新建话题辩论：`http://localhost:3000/debates/topic/new`

## 测试与检查

后端测试：

```powershell
cd E:\Codexproject\multi_agent_debate
conda activate multi_agent_debate
pytest
```

前端检查：

```powershell
cd E:\Codexproject\multi_agent_debate\frontend
npm run lint
npm run build
```

V4 最近一次前端验证结果：

```text
npm run lint   passed
npm run build  passed
```

## 公开仓库注意事项

上传 GitHub 前建议确认：

- 不提交 `.env`，只提交 `.env.example`。
- 不提交真实 `DEEPSEEK_API_KEY` 或任何其他 API key。
- 不提交包含真实用户文章、话题或生成内容的本地数据库 `debate_assistant.db`。
- 不提交 `.next`、`node_modules`、`.pytest_cache`、Python 缓存和编辑器缓存。
- `ui material` 中图片仅用于本地视觉参考；公开上传前需确认版权和必要性。
