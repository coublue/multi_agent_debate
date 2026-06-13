# V4 开发交接手册

本文档用于在后续新对话或上传归档前快速恢复 `multi_agent_debate` 第四阶段开发上下文。V4 基于 V3 的产品化辩论工作流继续开发，重点完成前端视觉重构、中文乱码修复和 Notion AI 风格暗色工作台统一。

## 项目定位

`multi_agent_debate` 是一个本地运行的多 Agent 文本辩论助手。用户可以提交文章或输入话题，系统会组织主持人、正方、反方和裁判完成多阶段辩论，生成结构化过程记录、争议点视图、裁判报告和 Markdown 报告。

V4 没有新增后端业务能力，核心是把 V3 已经完成的功能前端升级为更成熟的产品界面：

- 黑底、高对比、紫色强调的暗色视觉系统。
- 类 Notion AI 的编辑器窗口、AI Assist 输入面板和深色功能卡片。
- 统一首页、创建页、详情页、列表页、报告页的视觉语言。
- 修复前端源码中历史遗留的中文乱码。

## 模型接入约定

涉及 LLM API、模型接入或 Agent 底层模型配置时，继续默认使用 DeepSeek OpenAI-compatible 方案：

- API key：只从环境变量 `DEEPSEEK_API_KEY` 读取。
- Base URL：`https://api.deepseek.com`。
- 默认模型：`deepseek-v4-pro`。
- Python SDK：`openai.AsyncOpenAI`。

如果后续引入 LangChain，默认使用 `langchain_openai.ChatOpenAI` 接入。不要把真实 key 写入项目文件、测试、提交记录或文档。

## 技术栈

- 后端：FastAPI、SQLModel、SQLite、Pydantic v2、pydantic-settings、OpenAI-compatible SDK、pytest。
- 前端：Next.js 15、React 19、TypeScript、Tailwind CSS、ESLint。
- 数据库：默认本地 SQLite，文件名 `debate_assistant.db`。

## V4 完成范围

### 1. 中文乱码修复

V4 修复了前端主要页面和组件中的用户可见中文乱码，覆盖：

```text
frontend/app/layout.tsx
frontend/app/page.tsx
frontend/app/articles/page.tsx
frontend/app/articles/[articleId]/page.tsx
frontend/app/debates/page.tsx
frontend/app/debates/new/page.tsx
frontend/app/debates/topic/new/page.tsx
frontend/app/debates/[debateId]/page.tsx
frontend/components/
```

修复后，前端文案统一使用“多 Agent 辩论助手”、“文章辩论”、“话题辩论”、“裁判报告”、“争议点地图”等自然中文术语。

### 2. 全局暗色主题

`frontend/app/globals.css` 已切换为暗色主题：

- 页面背景：黑色和近黑渐变。
- 主面板：深灰。
- 文字：白色和中性灰。
- 品牌强调：紫色。
- 输入框 focus：蓝色描边。
- 旧版 teal/blue 浅色背景被移除或弱化。

### 3. 首页重构

`frontend/app/page.tsx` 已重构为 Notion AI 风格首屏：

- 顶部导航保留文章库、历史辩论、话题辩论和主按钮。
- 首屏使用大标题“让多个 Agent 替你思考、交锋、裁判”。
- 右侧增加深色编辑器窗口预览，包含 AI Assist 输入框、Generate 按钮和正方/反方/裁判预览片段。
- 功能区改为深色卡片，展示文章深度辩论、快速话题辩论、正反方交锋、争议点地图、裁判报告和 Markdown 导出。
- 工作台概览改成深色统计面板，保留辩论总数、进行中、已完成和最近记录。

### 4. 创建页面与表单改造

涉及文件：

```text
frontend/app/debates/new/page.tsx
frontend/app/debates/topic/new/page.tsx
frontend/components/article-form.tsx
frontend/components/topic-debate-form.tsx
```

完成内容：

- 页面改为暗色 AI Assist 命令面板风格。
- 输入框、textarea、radio option tile 统一为深色样式。
- 选中态使用紫色边框和紫色强调。
- 表单字段和提交逻辑保持不变。
- 文章辩论仍由页面层补充 `stage_mode = article_9`。
- 话题辩论继续支持 `topic_3` 和 `topic_5`。

### 5. 辩论详情页改造

涉及文件：

```text
frontend/app/debates/[debateId]/page.tsx
frontend/components/debate-summary-panel.tsx
frontend/components/debate-view-tabs.tsx
frontend/components/debate-stage-progress.tsx
frontend/components/debate-stage.tsx
frontend/components/agent-filter.tsx
frontend/components/agent-message-card.tsx
frontend/components/disagreement-map.tsx
frontend/components/judge-report.tsx
frontend/components/report-actions.tsx
```

完成内容：

- 详情页整体切换为暗色工作台。
- 顶部摘要、Markdown 导出区、标签页、文章/话题背景、辩论概要、争议点地图、过程视图、裁判报告均改为深色体系。
- Agent 消息卡片统一深色背景，只用角色色细节区分主持人、正方、反方和裁判。
- 保留轮询、删除、失败重跑、视图切换、Markdown 复制和导出行为。

### 6. 列表页和文章库改造

涉及文件：

```text
frontend/app/articles/page.tsx
frontend/app/articles/[articleId]/page.tsx
frontend/app/debates/page.tsx
frontend/components/article-list.tsx
frontend/components/article-detail.tsx
frontend/components/debate-list.tsx
frontend/components/debate-status.tsx
```

完成内容：

- 文章库、文章详情和历史辩论列表统一暗色工作台风格。
- 搜索、筛选、排序、空状态、删除按钮和状态标签统一样式。
- 保持现有 props、API 调用、路由跳转、筛选、排序、删除和创建辩论行为。

## 前端视觉参考说明

V4 前端视觉参考了 Notion AI 公开页面的风格特征，包括黑色背景、高对比白字、深灰编辑器窗口、紫色强调、AI Assist 输入框、功能卡片和少量魔法感符号。

本项目没有直接复用 Notion 官方代码或插画资源。`ui material` 文件夹中的图片仅作为本地视觉参考材料使用。若准备公开仓库，建议确认这些参考图是否需要上传；如果没有必要，建议不纳入 Git 提交。

## 关键目录

```text
backend/app/api/          FastAPI 路由
backend/app/agents/       Agent 封装与编排
backend/app/models/       SQLModel 数据模型
backend/app/prompts/      Agent prompt 模板
backend/app/schemas/      API 与 Agent 输出 schema
backend/app/services/     文章和辩论业务服务
backend/tests/            后端测试
frontend/app/             Next.js 页面
frontend/components/      前端展示组件
frontend/lib/             API client、类型和 Markdown 报告生成
docs/                     架构、API、开发计划和交接文档
```

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

访问入口：

- 前端首页：`http://localhost:3000`
- 文章库：`http://localhost:3000/articles`
- 历史辩论：`http://localhost:3000/debates`
- 新建文章辩论：`http://localhost:3000/debates/new`
- 新建话题辩论：`http://localhost:3000/debates/topic/new`
- 后端健康检查：`http://127.0.0.1:8000/api/health`
- 后端 OpenAPI：`http://127.0.0.1:8000/docs`

## 测试与验证

V4 本轮前端验证结果：

```text
npm run lint   passed
npm run build  passed
```

本轮还短暂启动 Next dev server，并验证以下路由均返回 `200`：

```text
/
/debates/new
/debates/topic/new
/articles
/debates
```

浏览器截图级验证未完成，原因是本次会话中内置浏览器控制所需的 Node 工具没有暴露。后续如继续做视觉微调，建议用浏览器检查桌面和移动端首屏、创建页、详情页、列表页。

## 敏感信息与公开仓库注意事项

上传 GitHub 前建议确认：

- `.env` 不要提交，只提交 `.env.example`。
- `DEEPSEEK_API_KEY` 只保留占位符，不出现真实 key。
- `debate_assistant.db` 是本地 SQLite 数据库，可能包含用户输入文章、话题和生成结果；如果是公开仓库，建议不要提交真实数据库文件。
- `.pytest_cache`、`.next`、`node_modules`、Python 缓存、编辑器缓存不要提交。
- `ui material` 中图片属于视觉参考素材，公开上传前需确认版权和必要性；如果只是本地参考，建议不提交。

## V4 归档建议

建议提交信息：

```text
feat: archive v4 notion-style frontend refresh
```

归档摘要：

- 新增 V4 开发计划和交接手册。
- 修复前端中文乱码。
- 全站切换为暗色视觉主题。
- 首页改为 Notion AI 风格首屏和编辑器窗口预览。
- 创建页改为 AI Assist 命令面板风格。
- 详情页、Agent 消息、阶段进度、裁判报告和争议点地图统一暗色工作台样式。
- 文章库、文章详情和历史辩论列表统一暗色列表体验。
- 前端 lint/build 通过。

## 后续建议

- 增加截图回归或 Playwright 端到端检查，避免视觉改动破坏关键页面。
- 进一步统一 `slate`、`neutral`、`zinc` 色阶，后续可抽取常用 class 或设计 token。
- 如果公开仓库，建议移除真实数据库和本地视觉参考图，只保留说明文档。
- 后续若继续扩展数据库结构，建议正式引入 Alembic，减少手写 SQLite 迁移复杂度。
