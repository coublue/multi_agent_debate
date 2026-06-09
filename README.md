# Multi Agent Debate

本项目是一个本地文本型 4 Agent 文章辩论助手。用户提交文章后，系统围绕文章主张组织主持人、正方、反方、裁判 4 个 Agent 进行结构化辩论，并输出可信度评分、胜方判断和可继续追问的问题。

默认 LLM 接入遵循 DeepSeek OpenAI-compatible 约定：

- API Key：只从环境变量 `DEEPSEEK_API_KEY` 读取
- Base URL：`https://api.deepseek.com`
- 模型：`deepseek-v4-pro`

不要把真实 API key 写入代码、提交记录或文档；本仓库示例只使用占位符。

## 技术栈

- 后端：Python 3.11+、FastAPI、SQLModel / SQLite、Pydantic v2、pytest、OpenAI-compatible Chat API
- 前端：Next.js 15、React 19、TypeScript、Tailwind CSS、ESLint

## 目录结构

```text
.
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI 路由
│   │   ├── agents/       # Agent 封装
│   │   ├── models/       # SQLModel 数据表与枚举
│   │   ├── prompts/      # Agent prompt 模板
│   │   ├── schemas/      # API 请求/响应模型
│   │   ├── config.py     # 环境变量与默认配置
│   │   ├── db.py         # 数据库初始化
│   │   ├── llm.py        # LLM 客户端适配
│   │   └── main.py       # FastAPI 应用入口
│   ├── tests/            # 单元测试与集成契约测试
│   └── requirements.txt
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── package.json
├── docs/
├── .env.example
├── pytest.ini
└── multi_agent_debate.md
```

## 环境变量

复制 `.env.example` 为 `.env`，按需填写。`DEEPSEEK_API_KEY` 使用占位符示例，运行真实 LLM 调用前在本机环境变量或 `.env` 中填入自己的 key。

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
python -m venv .venv
.\.venv\Scripts\Activate.ps1
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
.\.venv\Scripts\Activate.ps1
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

## 测试与检查

后端测试默认不需要联网：

```powershell
cd E:\Codexproject\multi_agent_debate
.\.venv\Scripts\Activate.ps1
pytest
```

前端 lint：

```powershell
cd E:\Codexproject\multi_agent_debate\frontend
npm run lint
```
