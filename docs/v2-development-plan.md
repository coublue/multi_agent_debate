# V2 开发计划

本文档用于明确 `multi_agent_debate` 第二版开发范围、实现顺序和验收标准。V2 基于 V1 本地 MVP 继续开发，目标不是扩展成复杂任务平台，而是补齐文章资源管理，并让辩论过程更可见、更易阅读。

## 一、版本目标

V2 的核心目标：

- 文章可以作为独立资源被查看和删除。
- 删除辩论时不影响文章本身。
- 新增快速话题辩论：输入一个话题即可发起 5 阶段快速辩论。
- 创建辩论后，用户可以逐步看到 Agent 输出，而不是长时间等待最终结果；文章辩论为 9 阶段，话题辩论为 5 阶段。
- 辩论详情页支持按 Agent 发言折叠、展开和高亮，提升阅读效率。

V2 不包含：

- 文章编辑功能。
- 用户登录、权限、多用户隔离。
- 生产级任务队列。
- 联网搜索、PDF/OCR、多模态输入。
- 复杂的辩论任务状态字段。
- Agent 追问、争议点矩阵、裁判引用增强等额外互动机制。

## 二、技术栈与运行约定

### 2.1 后端技术栈

V2 继续沿用 V1 后端技术栈：

- Web 框架：FastAPI
- 数据模型与 ORM：SQLModel
- 数据库：SQLite
- 数据校验：Pydantic v2
- 配置管理：pydantic-settings
- LLM SDK：OpenAI-compatible Python SDK
- 测试：pytest、FastAPI TestClient

V2 后端新增实现重点：

- 使用 FastAPI `BackgroundTasks` 执行后台辩论流程。
- 服务层保留同步可测试入口，避免后台任务难以单元测试。
- 阶段结果逐步写入 `agent_messages`，供前端轮询展示。
- 文章删除时显式清理关联辩论和阶段消息。
- 支持文章辩论与快速话题辩论两类创建入口。

### 2.2 前端技术栈

V2 继续沿用 V1 前端技术栈：

- 框架：Next.js 15 App Router
- UI：React 19
- 语言：TypeScript
- 样式：Tailwind CSS
- 代码检查：ESLint
- 数据请求：浏览器 `fetch` 封装在 `frontend/lib/api.ts`

V2 前端新增实现重点：

- 新增文章库页面和文章详情页面。
- 新增快速话题辩论创建页面。
- 在辩论详情页增强轮询、阶段进度、Agent 筛选、消息折叠和高亮。
- 继续使用客户端组件处理本地交互状态。
- 不引入新的 UI 组件库，保持 V1 轻量样式体系。

### 2.3 数据库

V2 仍使用本地 SQLite：

```text
debate_assistant.db
```

现有核心表：

- `articles`：文章。
- `debates`：辩论总体记录。
- `agent_messages`：每个阶段的 Agent 输出。

V2 优先不新增数据表，不引入 Alembic。需要的文章统计字段通过查询计算，例如关联辩论数量、最近一次辩论结果。

快速话题辩论优先复用现有 `articles`、`debates`、`agent_messages` 三表。后端为话题创建一条特殊文章记录：

- `title`：话题。
- `source`：固定为 `topic` 或其他内部标识。
- `content`：背景说明；如果没有背景说明，则使用话题本身。
- `user_question`：关注问题。

文章库中可以展示这类记录，但需要标记为“话题”，避免和普通文章混淆。若后续需要更严格的数据建模，再评估新增 `debate_type` 或 `article_kind` 字段及迁移方案。

### 2.4 本地运行命令

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

后端测试：

```powershell
cd E:\Codexproject\multi_agent_debate
$env:PYTHONPATH='E:\Codexproject\multi_agent_debate\backend'
E:\Anaconda\envs\multi_agents_debate\python.exe -m pytest backend\tests
```

前端验证：

```powershell
cd E:\Codexproject\multi_agent_debate\frontend
npm run lint
npm run build
```

## 三、项目结构与模块职责

### 3.1 V1 现有结构

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
docs/                     架构、API、开发计划和交接文档
```

### 3.2 V2 建议新增或重点修改文件

后端：

```text
backend/app/api/articles.py
backend/app/api/debates.py
backend/app/services/article_service.py
backend/app/services/debate_service.py
backend/app/agents/orchestrator.py
backend/app/agents/topic_orchestrator.py
backend/app/schemas/article.py
backend/app/schemas/debate.py
backend/tests/test_article_create.py
backend/tests/test_debate_api.py
```

前端：

```text
frontend/app/page.tsx
frontend/app/articles/page.tsx
frontend/app/articles/[articleId]/page.tsx
frontend/app/debates/topic/new/page.tsx
frontend/app/debates/[debateId]/page.tsx
frontend/components/article-list.tsx
frontend/components/article-detail.tsx
frontend/components/topic-debate-form.tsx
frontend/components/debate-stage-progress.tsx
frontend/components/agent-filter.tsx
frontend/components/agent-message-card.tsx
frontend/components/debate-stage.tsx
frontend/lib/api.ts
frontend/lib/types.ts
```

文档：

```text
docs/v2-development-plan.md
docs/api-spec.md
docs/architecture.md
```

V2 实现完成后，建议同步更新 `docs/api-spec.md` 和 `docs/architecture.md`，使其反映新的文章删除接口、文章关联辩论接口、后台辩论执行流程和前端进度展示逻辑。
同时补充快速话题辩论的创建接口、5 阶段流程和数据标记策略。

### 3.3 模块职责边界

`backend/app/api/`：

- 只处理 HTTP 请求、响应模型、参数校验和依赖注入。
- 不直接编排复杂删除逻辑或辩论执行逻辑。

`backend/app/services/`：

- 承担文章删除、辩论创建、辩论执行、阶段消息保存等业务逻辑。
- 后台任务入口应放在服务层，便于测试。

`backend/app/agents/`：

- 继续负责 Agent 调用和 9 阶段编排。
- V2 可以为逐步落库增加阶段回调或生成器式执行接口。

`backend/app/schemas/`：

- 定义 API 输入输出结构。
- V2 新增文章列表统计字段时，应优先在 schema 层显式表达。

`frontend/lib/`：

- `api.ts` 只封装请求函数。
- `types.ts` 只维护前后端共享的 TypeScript 类型。

`frontend/app/`：

- 负责页面级数据加载、路由跳转和交互状态。

`frontend/components/`：

- 负责可复用 UI 组件，例如文章列表、阶段进度、Agent 筛选和消息卡片。

## 四、文章管理需求

### 4.1 文章列表

新增前端文章列表页，用于查看数据库中已有文章。

建议路径：

```text
/articles
```

列表展示字段：

- 文章标题
- 来源
- 创建时间
- 关联辩论数量
- 最近一次辩论状态或结果

列表操作：

- 查看文章详情
- 删除文章
- 基于文章创建新辩论

### 4.2 文章详情

新增文章详情页。

建议路径：

```text
/articles/{articleId}
```

详情展示内容：

- 标题
- 来源
- 关注问题
- 正文
- 创建时间
- 更新时间
- 该文章关联的辩论列表

详情页操作：

- 返回文章列表
- 删除文章
- 基于当前文章创建新辩论
- 进入某一场历史辩论详情

### 4.3 删除文章

删除文章需要处理文章与辩论的关系。

推荐规则：

- 删除辩论：只删除该辩论和对应 `agent_messages`，不删除文章。
- 删除文章：删除文章本身，并级联删除该文章下的所有辩论和对应 `agent_messages`。

前端删除文章时必须明确提示：

```text
删除文章会同时删除该文章下的所有辩论记录，此操作不可恢复。
```

如果后续希望保守一些，也可以改成“有关联辩论时禁止删除文章”。但 V2 建议采用级联删除，避免数据库中出现无文章的辩论。

## 五、快速话题辩论需求

快速话题辩论用于低成本、短耗时地围绕一个话题进行正反讨论。它补充文章辩论，不替代文章辩论。

### 5.1 创建入口

新增前端创建页：

```text
/debates/topic/new
```

首页或新建辩论页需要提供清晰入口：

- 新建文章辩论
- 新建话题辩论

### 5.2 输入字段

话题辩论表单字段：

- 话题：必填，一句话或一个问题。
- 背景说明：可选，用于补充上下文。
- 关注问题：可选，用于指定裁判重点。

示例：

```text
话题：AI 编程会不会降低初级程序员的价值？
背景说明：从未来 3 年就业市场和团队协作角度讨论。
关注问题：哪些能力会更重要？
```

### 5.3 后端创建策略

V2 优先采用轻量实现：话题辩论内部创建一条特殊文章，再复用现有辩论详情页和消息展示。

建议新增接口：

```text
POST /api/topic-debates
```

请求：

```json
{
  "topic": "AI 编程会不会降低初级程序员的价值？",
  "background": "从未来 3 年就业市场和团队协作角度讨论。",
  "user_question": "哪些能力会更重要？"
}
```

响应字段同 `DebateRead`。

内部数据写入建议：

- 创建特殊 `Article`。
- `Article.title = topic`。
- `Article.source = "topic"`。
- `Article.content = background || topic`。
- `Article.user_question = user_question`。
- 创建 `Debate` 并后台执行快速话题辩论。

文章库展示时，`source === "topic"` 的记录应标记为“话题”。

### 5.4 5 阶段快速辩论流程

话题辩论默认使用 5 阶段，不使用文章辩论的完整 9 阶段。

建议阶段：

1. `topic_moderator_opening`：主持人定义辩题、边界和讨论规则。
2. `topic_pro_opening`：正方提出支持观点。
3. `topic_con_opening`：反方提出质疑观点。
4. `topic_moderator_summary`：主持人总结双方交锋和关键分歧。
5. `topic_judge_report`：裁判给出结论、可信度和后续思考问题。

为了最大化复用，也可以先映射到现有阶段枚举：

1. `moderator_opening`
2. `pro_opening`
3. `con_opening`
4. `moderator_midpoint`
5. `judge_report`

推荐 V2 采用映射到现有阶段枚举的方案，避免改表和大量前端类型；前端进度组件根据辩论来源识别为话题时显示 5 阶段。

### 5.5 详情页复用

话题辩论详情页复用：

- 现有 `/debates/{debateId}` 页面。
- 后台执行与轮询机制。
- 阶段进度展示。
- Agent 筛选。
- Agent 消息折叠/展开。
- 裁判报告展示。

详情页展示上需要体现这是“话题辩论”，例如：

- 标题上方显示“话题辩论”。
- 文章区域可改为“话题背景”。
- 阶段进度显示 5 阶段，而不是 9 阶段。

### 5.6 与文章辩论的边界

- 文章辩论保持 9 阶段严肃分析。
- 话题辩论默认 5 阶段快速完成。
- 文章辩论继续进入文章管理主流程。
- 话题记录可以出现在文章库，但必须标记为“话题”；如果后续希望更干净，可以在文章列表增加筛选。

## 六、辩论过程可视化需求

### 6.1 创建辩论后立即返回

V1 当前 `POST /api/debates` 会同步执行完整 9 阶段辩论，接口返回时间较长。V2 需要改为：

1. 创建 `debates` 记录，状态为 `pending` 或 `running`。
2. 立即返回 `DebateRead`。
3. 后端在后台继续执行 9 阶段辩论。
4. 前端跳转到辩论详情页。
5. 详情页通过轮询看到 Agent 输出逐步增加。

V2 可以使用 FastAPI `BackgroundTasks` 实现后台执行，不引入 Celery、Redis 或生产级任务队列。

话题辩论同样使用后台执行并立即返回。

### 6.2 阶段输出逐步落库

V1 的 `DebateOrchestrator.run()` 会一次性返回全部阶段结果。V2 需要调整执行方式，让每个阶段完成后立即保存到 `agent_messages`。

目标行为：

- `moderator_opening` 完成后，详情页可看到主持人开场。
- `pro_opening` 完成后，详情页可看到正方开场。
- 后续阶段依次出现。
- 如果中途失败，已完成阶段仍可查看。

不要求新增复杂状态字段。前端可通过已有数据推断：

- `messages.length === 0`：等待首个阶段输出。
- `messages.length > 0 && status === "running"`：辩论进行中。
- `status === "completed"`：辩论完成。
- `status === "failed"`：辩论失败，展示 `error_message` 和已完成消息。

### 6.3 阶段进度展示

辩论详情页新增阶段进度视图。

文章辩论阶段顺序保持 V1 不变：

1. `moderator_opening`
2. `pro_opening`
3. `con_opening`
4. `pro_rebuttal`
5. `con_rebuttal`
6. `moderator_midpoint`
7. `pro_closing`
8. `con_closing`
9. `judge_report`

话题辩论阶段显示 5 阶段：

1. 主持人开场
2. 正方观点
3. 反方观点
4. 主持人总结
5. 裁判报告

每个阶段在前端展示为：

- 已完成：该阶段已有 `agent_messages`。
- 当前等待：前一个阶段已完成、当前阶段尚未完成，且辩论仍在运行。
- 未开始：前序阶段尚未完成。
- 失败：辩论状态为 `failed`，且当前阶段之后无输出。

## 七、Agent 发言折叠与高亮

V2 保留 Agent 互动增强中的“发言折叠/高亮”能力，暂不实现其他 Agent 互动机制。

### 7.1 Agent 筛选

辩论详情页新增 Agent 筛选控件：

- 全部
- 主持人
- 正方
- 反方
- 裁判

筛选时只显示对应 Agent 的阶段消息。

### 7.2 阶段折叠

每条 Agent 消息支持折叠和展开。

默认建议：

- 已完成辩论：全部展开或仅裁判报告展开。
- 运行中辩论：最新阶段展开，历史阶段可折叠。

具体默认策略可以在实现时根据页面观感调整。

### 7.3 Agent 高亮

不同 Agent 使用稳定的视觉标识：

- 主持人：中性色或蓝色
- 正方：绿色
- 反方：红色或橙色
- 裁判：紫色或深色

高亮应服务阅读，不做过度装饰。

## 八、后端开发任务

### 8.1 文章 API 增强

新增或调整接口：

```text
GET    /api/articles
GET    /api/articles/{article_id}
DELETE /api/articles/{article_id}
GET    /api/articles/{article_id}/debates
```

其中：

- `GET /api/articles` 建议返回关联辩论数量。
- `GET /api/articles/{article_id}/debates` 返回该文章下的辩论列表。
- `DELETE /api/articles/{article_id}` 级联删除该文章、相关辩论和相关 `agent_messages`。

### 8.2 快速话题辩论 API

新增接口：

```text
POST /api/topic-debates
```

后端任务：

- 新增 `TopicDebateCreate` schema。
- 创建特殊文章记录并标记为话题。
- 创建辩论记录。
- 使用后台任务执行 5 阶段快速话题辩论。
- 返回 `DebateRead`。

### 8.3 辩论后台执行

调整 `POST /api/debates`：

- 校验文章存在。
- 创建辩论记录。
- 使用后台任务启动辩论执行。
- 立即返回新辩论。

调整服务层：

- 保留 `create_debate()`。
- 将同步执行链路改造成后台可调用函数。
- 每个阶段完成后立即保存消息。
- 失败时保存已完成消息，设置 `status = failed` 和 `error_message`。
- 支持文章辩论 9 阶段和话题辩论 5 阶段两种编排。

### 8.4 测试

后端测试需要覆盖：

- 文章列表。
- 文章详情。
- 删除无辩论文章。
- 删除有关联辩论文章时，相关辩论和消息被删除。
- 删除辩论不删除文章。
- 创建辩论接口能快速返回新辩论。
- 创建话题辩论接口能快速返回新辩论。
- 话题辩论创建特殊文章记录。
- 话题辩论执行 5 阶段。
- 后台执行完成后，阶段消息逐步或最终存在。
- 失败时保留已完成阶段消息。

## 九、前端开发任务

### 9.1 导航调整

首页保留最近辩论列表，同时增加入口：

- 新建辩论
- 新建话题辩论
- 文章库

### 9.2 文章页面

新增页面：

```text
frontend/app/articles/page.tsx
frontend/app/articles/[articleId]/page.tsx
```

新增或复用组件：

```text
frontend/components/article-list.tsx
frontend/components/article-detail.tsx
```

### 9.3 快速话题辩论页面

新增页面：

```text
frontend/app/debates/topic/new/page.tsx
```

新增组件：

```text
frontend/components/topic-debate-form.tsx
```

页面行为：

- 输入话题。
- 可选输入背景说明和关注问题。
- 提交后调用 `POST /api/topic-debates`。
- 创建成功后跳转 `/debates/{debateId}`。

### 9.4 API Client 和类型

前端 `lib/api.ts` 新增：

- `deleteArticle(articleId)`
- `listArticleDebates(articleId)`
- `createTopicDebate(payload)`

前端 `lib/types.ts` 新增或扩展：

- `ArticleListItem` 增加 `debate_count`
- `ArticleListItem` 增加最近辩论摘要字段：`latest_debate_id`、`latest_debate_status`、`latest_debate_winner`、`latest_debate_credibility_score`、`latest_debate_created_at`
- `TopicDebateCreate`

具体字段以后端 schema 为准。

### 9.5 辩论详情页增强

现有详情页继续轮询 `GET /api/debates/{debateId}`。

新增展示：

- 文章辩论 9 阶段进度条或时间线。
- 话题辩论 5 阶段进度条或时间线。
- 当前等待阶段。
- Agent 筛选控件。
- Agent 消息折叠/展开。
- 不同 Agent 的视觉高亮。

## 十、开发任务拆分建议

### 10.1 后端文章管理任务

范围：

- 增强文章 schema。
- 增加文章删除服务。
- 增加文章关联辩论查询。
- 增加对应 API 测试。

交付物：

- `DELETE /api/articles/{article_id}`
- `GET /api/articles/{article_id}/debates`
- 文章列表返回必要统计字段。

### 10.2 后端辩论执行任务

范围：

- 改造创建辩论接口为快速返回。
- 使用 `BackgroundTasks` 执行辩论。
- 调整 orchestrator 或 service，使阶段输出逐步保存。
- 补齐失败路径测试。

交付物：

- `POST /api/debates` 不再阻塞等待完整辩论。
- 详情接口可观察到逐步增加的 `messages`。

### 10.3 后端快速话题辩论任务

范围：

- 新增话题辩论创建 schema 和 API。
- 实现 5 阶段快速编排。
- 复用后台任务和消息落库。
- 补齐 API 与编排测试。

交付物：

- `POST /api/topic-debates`
- 5 阶段话题辩论可后台执行。

### 10.4 前端文章库任务

范围：

- 新增文章列表页。
- 新增文章详情页。
- 支持删除文章。
- 支持从已有文章创建辩论。

交付物：

- `/articles`
- `/articles/{articleId}`
- 首页文章库入口。

### 10.5 前端快速话题辩论任务

范围：

- 新增话题辩论创建页。
- 新增话题辩论表单。
- 首页或新建页面增加入口。
- 创建成功后跳转辩论详情。

交付物：

- `/debates/topic/new`
- `topic-debate-form` 组件。

### 10.6 前端辩论可视化任务

范围：

- 增加文章辩论 9 阶段进度组件。
- 增加话题辩论 5 阶段进度显示。
- 优化详情页轮询。
- 增加运行中、完成、失败的展示状态。

交付物：

- `debate-stage-progress` 组件。
- 详情页可逐步展示 Agent 输出。

### 10.7 前端 Agent 阅读体验任务

范围：

- 增加 Agent 筛选。
- 增加消息折叠/展开。
- 增加 Agent 高亮。

交付物：

- `agent-filter` 组件。
- 增强后的 `agent-message-card`。

## 十一、数据库与迁移策略

V2 优先不引入 Alembic。

原因：

- 当前数据表已经包含文章、辩论、阶段消息三类核心数据。
- V2 主要是 API 和执行流程调整。
- 若仅新增响应字段，例如 `debate_count`，可通过查询计算，不必改表。
- 快速话题辩论优先复用 `articles.source = "topic"` 标记，不新增字段。

如果实现过程中需要新增表字段，再评估是否引入迁移方案。

## 十二、验收标准

V2 完成时应满足：

- 可以在前端查看所有文章。
- 可以查看单篇文章详情。
- 可以删除文章，并正确处理其关联辩论和消息。
- 删除单场辩论不会删除文章。
- 可以从已有文章再次创建辩论。
- 可以输入一个话题创建快速话题辩论。
- 话题辩论支持可选背景说明和关注问题。
- 话题辩论默认 5 阶段快速执行。
- 话题辩论详情页复用现有辩论详情页能力。
- 文章辩论仍保持 9 阶段流程。
- 创建辩论后页面能快速跳转到详情页。
- 辩论详情页能逐步显示 Agent 输出。
- 运行中、完成、失败三种状态下，详情页都有清晰展示。
- 可以按主持人、正方、反方、裁判筛选 Agent 发言。
- Agent 消息可以折叠/展开。
- 后端测试通过。
- 前端 lint/build 通过。

## 十三、建议实施顺序

1. 后端补齐文章删除和文章关联辩论查询。
2. 后端改造辩论创建为后台执行。
3. 后端改造阶段输出为逐步落库。
4. 后端新增快速话题辩论创建接口和 5 阶段编排。
5. 前端新增文章列表和文章详情。
6. 实现从已有文章创建辩论。
7. 前端新增快速话题辩论创建页。
8. 前端增强辩论详情页轮询和阶段进度展示，兼容 9 阶段文章辩论与 5 阶段话题辩论。
9. 前端增加 Agent 筛选、折叠和高亮。
10. 补齐测试，运行后端 pytest、前端 lint 和 build。

## 十四、开发交接检查清单

每个任务交接时建议说明：

- 本次修改涉及的后端 API。
- 本次修改涉及的前端页面和组件。
- 是否改变数据库结构。
- 是否改变 LLM 调用行为。
- 是否影响文章辩论或话题辩论的阶段编排。
- 是否影响删除数据的行为。
- 已运行的测试或未能运行的原因。
- 已知限制和下一步建议。

V2 完整交接时建议补充：

- 当前分支或提交哈希。
- 后端测试结果。
- 前端 lint/build 结果。
- 本地运行入口。
- 关键页面截图或手动验证步骤。

## 十五、DeepSeek 接入约定

V2 继续沿用 V1 的模型接入约定：

- API key 只从环境变量 `DEEPSEEK_API_KEY` 读取。
- Base URL 默认 `https://api.deepseek.com`。
- 默认模型 `deepseek-v4-pro`。
- Python SDK 使用 OpenAI-compatible 方案。

除非明确指定其他模型或供应商，不改变默认 LLM 接入方案。
