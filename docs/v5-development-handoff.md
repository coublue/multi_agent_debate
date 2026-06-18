# V5 开发交接手册

本文档记录 `multi_agent_debate` V5 的实际交付结果、关键实现、验证状态和后续注意事项。开发前范围基线见 `docs/v5-development-plan.md`；开发过程中的任务拆分和临时协调不写入计划文件。

## 版本目标

V5 在 V4 暗色 Notion AI 风格基础上完成两类升级：

- 收敛首页信息架构，把首页从功能宣传页推进为可继续工作的辩论工作台。
- 支持从已完成裁判结果继续追问，以独立子辩论形成可回看的分析链路。

## 已完成内容

### 1. 首页与全站导航

- 删除首页右上角“开始辩论”按钮。
- 首页顶栏只保留“文章库”和“历史辩论”。
- 新增响应式 `SiteHeader`，移动端不会隐藏全部导航。
- 首页首屏继续保留文章辩论与话题辩论入口。
- 首页新增继续工作区，展示进行中和最近完成的辩论。
- 工作台支持中文状态、加载占位、加载失败重试和可执行空状态。
- 原六张能力卡片调整为五步辩论流程：输入文章或话题、提取关注问题、主持人定义边界、正反方多轮交锋、裁判形成报告。

### 2. 页面连通性

- 文章库、历史辩论、文章辩论创建页、话题辩论创建页增加“返回首页”。
- 文章详情增加“返回文章库”。
- 辩论详情增加“返回历史辩论”。
- 共享导航和页面层级返回入口同时保留；加载失败、无效 ID 和空状态不会隐藏返回路径。
- 删除辩论成功后返回历史辩论页。
- 文章与话题创建页可以互相切换，主要页面不存在必须依赖浏览器后退才能离开的死路。

### 3. 从结果继续追问

- 已完成辩论详情页显示“从结果继续追问”表单。
- 支持选择裁判建议问题或输入最长 1000 字的新问题。
- 空问题不能提交；提交时锁定表单，失败后保留输入和错误信息。
- 创建成功后跳转到新的子辩论详情页。
- 子辩论显示当前追问和父辩论链接。
- 子辩论拥有独立状态、阶段消息、裁判报告、失败重跑和 Markdown 导出。
- 原辩论与原文章不会被修改。

### 4. 后端数据与 API

`debates` 新增：

- `parent_debate_id`：直接父辩论，可空，自关联。
- `follow_up_question`：子辩论当前追问。
- `parent_context_snapshot`：父结果的裁剪快照。

新增接口：

```text
POST /api/debates/{debate_id}/follow-ups
```

请求包含 `question`，并可选覆盖 `debate_depth`、`output_style`、`stage_mode`。只有 `completed` 父辩论允许创建追问；不存在返回 `404`，状态不允许返回 `409`，schema 错误返回 `422`。

子辩论复用父辩论的 `article_id` 和现有 `BackgroundTasks -> run_debate_background -> run_debate -> DebateOrchestrator` 链路。相同父辩论、问题和有效配置的活动请求会返回已有子辩论，覆盖前端双击场景。

### 5. 上下文与 Prompt

父结果快照只包含：

- 父辩论 ID、主张和辩题。
- 裁判结论与最终摘要。
- 判定依据、关键分歧、可信部分和存疑部分。

限制规则：

- 标量文本最长 1000 字。
- 每个数组最多 5 项。
- 每个数组项最长 500 字。
- 不传递父辩论全部 Agent 消息或完整祖先链。

文章和话题的主持人、正方、反方及裁判 prompt 均增加防锚定要求：上一轮裁判结论只是待检验背景，新一轮不得直接继承胜负判断。

### 6. SQLite 兼容与删除行为

- `init_db()` 会为旧 SQLite 数据库补充追问字段和父辩论索引。
- 旧记录的新字段保持 `NULL`。
- 支持多级追问。
- 删除父辩论时保留子辩论和上下文快照，并将直接 `parent_debate_id` 置空，避免无提示级联删除分析链。

## 重要文件

### 后端

```text
backend/app/models/debate.py
backend/app/schemas/debate.py
backend/app/api/debates.py
backend/app/services/debate_service.py
backend/app/db.py
backend/app/prompts/*.txt
backend/tests/test_debate_api.py
backend/tests/test_debate_config_service.py
backend/tests/test_db_migration.py
backend/tests/test_agents_prompts.py
backend/tests/test_integration_contracts.py
```

### 前端

```text
frontend/app/page.tsx
frontend/app/articles/page.tsx
frontend/app/articles/[articleId]/page.tsx
frontend/app/debates/page.tsx
frontend/app/debates/new/page.tsx
frontend/app/debates/topic/new/page.tsx
frontend/app/debates/[debateId]/page.tsx
frontend/components/site-header.tsx
frontend/components/page-back-link.tsx
frontend/components/follow-up-debate-form.tsx
frontend/lib/api.ts
frontend/lib/types.ts
```

## 验证结果

后端：

```text
pytest: 79 passed
```

存在一条来自 Starlette/httpx 的第三方弃用警告，不影响测试结果。

前端：

```text
npm run lint:  passed
npm run build: passed
```

Next.js 成功构建 8 个路由。生产模式路由烟测均返回 `200`：

```text
/
/articles
/debates
/debates/new
/debates/topic/new
/debates/1
```

`git diff --check` 通过，仅有 Windows 环境下 LF→CRLF 提示。

用户已完成本地视觉与流程验收。

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

## 模型接入约定

继续使用 DeepSeek OpenAI-compatible：

- API key：`DEEPSEEK_API_KEY`。
- Base URL：`https://api.deepseek.com`。
- 默认模型：`deepseek-v4-pro`。
- 如后续引入 LangChain，使用 `langchain_openai.ChatOpenAI`。

真实 key 不得写入代码、文档、测试或提交记录。

## 已知限制

- 追问请求去重通过查询活动子辩论实现，足以覆盖前端重复点击；极端并发请求尚无数据库唯一约束或显式幂等键。
- 删除父辩论后，子辩论仍有创建时快照，但直接父链接会被置空。
- 当前使用轻量 SQLite 迁移；后续如果继续增加关联表和字段，建议引入 Alembic。

## 后续版本建议

- 为追问创建增加显式幂等键或数据库唯一约束。
- 增加父子辩论链或树状历史视图。
- 增加 Playwright 页面连通性和关键视觉回归。
- 评估模板预设和多场报告对比，不在 V5 内加入收藏与置顶。

## Git 归档与 GitHub 发布

V5 已在本地 `main` 分支归档并创建 `v5` 标签，提交信息为：

```text
feat: archive v5 follow-up debate workspace
```

目标远端：

```text
https://github.com/coublue/multi_agent_debate
```

收尾时已确认 `origin` 指向上述仓库。HTTPS 推送多次因当前环境无法连接 GitHub 443 端口而失败；SSH 路径没有可用公钥。因此本地提交和标签已完成，远端推送待网络或认证恢复后执行：

```powershell
git push origin main
git push origin v5
```
