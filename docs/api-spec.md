# API 规格

所有接口默认前缀为 `/api`，请求与响应均使用 JSON。

## Health

### GET `/api/health`

用于检查后端是否启动。

响应：

```json
{
  "status": "ok",
  "app": "Multi Agent Debate",
  "version": "0.1.0"
}
```

## Articles

### POST `/api/articles`

创建待辩论文章。

请求：

```json
{
  "title": "文章标题",
  "source": "https://example.com/source",
  "content": "文章正文",
  "user_question": "我想重点判断这篇文章是否可信"
}
```

字段说明：

- `title`：必填，文章标题。
- `source`：可选，来源 URL、出版物或备注。
- `content`：必填，文章正文。
- `user_question`：可选，用户希望辩论重点关注的问题。

响应：

```json
{
  "id": 1,
  "title": "文章标题",
  "source": "https://example.com/source",
  "content": "文章正文",
  "user_question": "我想重点判断这篇文章是否可信",
  "created_at": "2026-06-07T10:00:00",
  "updated_at": "2026-06-07T10:00:00"
}
```

### GET `/api/articles`

列出文章。

响应：

```json
[
  {
    "id": 1,
    "title": "文章标题",
    "source": "https://example.com/source",
    "created_at": "2026-06-07T10:00:00",
    "debate_count": 2,
    "latest_debate_id": 3,
    "latest_debate_status": "completed",
    "latest_debate_winner": "mixed",
    "latest_debate_credibility_score": 72,
    "latest_debate_created_at": "2026-06-07T11:00:00"
  }
]
```

### GET `/api/articles/{article_id}`

读取单篇文章详情。

响应字段同 `ArticleRead`：`id`、`title`、`source`、`content`、`user_question`、`created_at`、`updated_at`。

### GET `/api/articles/{article_id}/debates`

读取某篇文章关联的辩论列表。

响应字段同 `DebateListItem`：

```json
[
  {
    "id": 1,
    "article_id": 1,
    "title": "文章标题",
    "status": "completed",
    "winner": "mixed",
    "credibility_score": 72,
    "created_at": "2026-06-07T10:00:00"
  }
]
```

### DELETE `/api/articles/{article_id}`

删除文章。

删除文章会同时删除该文章下的所有辩论记录和对应 `agent_messages`。

成功响应：`204 No Content`。

如果文章不存在，返回：

```json
{
  "detail": "Article not found"
}
```

## Debates

### POST `/api/debates`

基于已有文章创建一场辩论。

请求：

```json
{
  "article_id": 1
}
```

响应：

```json
{
  "id": 1,
  "article_id": 1,
  "parent_debate_id": null,
  "follow_up_question": null,
  "status": "pending",
  "main_claim": null,
  "debate_topic": null,
  "final_report": null,
  "winner": null,
  "credibility_score": null,
  "error_message": null,
  "created_at": "2026-06-07T10:00:00",
  "updated_at": "2026-06-07T10:00:00"
}
```

V2 起，该接口只创建辩论并立即返回，不等待 9 阶段全部完成。后端会在后台继续执行辩论流程，前端可轮询 `GET /api/debates/{debate_id}` 获取逐步增加的 `messages`。

### POST `/api/topic-debates`

基于一个话题创建快速话题辩论。

请求：

```json
{
  "topic": "AI 编程会不会降低初级程序员的价值？",
  "background": "从未来 3 年就业市场和团队协作角度讨论。",
  "user_question": "哪些能力会更重要？"
}
```

字段说明：

- `topic`：必填，话题或辩题，不允许为空白。
- `background`：可选，背景说明。
- `user_question`：可选，用户希望重点关注的问题。

响应字段同 `DebateRead`。后端会创建一条特殊文章记录：

- `title`：话题。
- `source`：固定为 `topic`。
- `content`：背景说明；如果未提供背景说明，则使用话题本身。
- `user_question`：关注问题。

该接口会立即返回新辩论，后台执行 5 阶段快速话题辩论。前端可继续轮询 `GET /api/debates/{debate_id}`。

`status` 枚举：

- `pending`：已创建，等待执行。
- `running`：辩论执行中。
- `completed`：辩论完成。
- `failed`：执行失败，查看 `error_message`。

### GET `/api/debates`

列出辩论。

响应：

```json
[
  {
    "id": 1,
    "article_id": 1,
    "title": "文章标题",
    "status": "completed",
    "winner": "mixed",
    "credibility_score": 72,
    "created_at": "2026-06-07T10:00:00"
  }
]
```

### GET `/api/debates/{debate_id}`

读取辩论详情，包含原文和所有 Agent 消息。

响应核心字段：

```json
{
  "id": 1,
  "article_id": 1,
  "parent_debate_id": null,
  "follow_up_question": null,
  "status": "completed",
  "main_claim": "文章主张",
  "debate_topic": "这篇文章的核心主张是否可信",
  "final_report": {
    "main_claim": "文章主张",
    "pro_strongest_points": ["支持方最强论点"],
    "con_strongest_points": ["反方最强论点"],
    "key_disagreements": ["关键分歧"],
    "winner": "mixed",
    "credibility_score": 72,
    "credible_parts": ["较可信部分"],
    "questionable_parts": ["存疑部分"],
    "follow_up_questions": ["后续问题"],
    "final_summary": "裁判总结"
  },
  "winner": "mixed",
  "credibility_score": 72,
  "error_message": null,
  "article": {
    "id": 1,
    "title": "文章标题",
    "source": null,
    "content": "文章正文",
    "user_question": null,
    "created_at": "2026-06-07T10:00:00",
    "updated_at": "2026-06-07T10:00:00"
  },
  "messages": [
    {
      "id": 1,
      "debate_id": 1,
      "agent_name": "Moderator Agent",
      "agent_role": "moderator",
      "round_index": 0,
      "stage": "moderator_opening",
      "message_type": "structured",
      "content": {},
      "target_agent": null,
      "created_at": "2026-06-07T10:00:00"
    }
  ],
  "created_at": "2026-06-07T10:00:00",
  "updated_at": "2026-06-07T10:05:00"
}
```

### POST `/api/debates/{debate_id}/follow-ups`

从一场已完成辩论创建独立的追问子辩论。父辩论和原文章不会被修改；子辩论默认继承父辩论的深度、输出风格和阶段模式，并通过后台任务执行。

请求：

```json
{
  "question": "如果只考虑没有专职运维团队的初创公司，这个结论还成立吗？",
  "debate_depth": "standard",
  "output_style": "detailed",
  "stage_mode": "article_9"
}
```

字段说明：

- `question`：必填，去除首尾空白后长度为 1–1000。
- `debate_depth`：可选；未提供时继承父辩论。
- `output_style`：可选；未提供时继承父辩论。
- `stage_mode`：可选；未提供时继承父辩论，且必须与文章/话题类型兼容。

响应使用 `DebateRead`，其中：

```json
{
  "id": 2,
  "article_id": 1,
  "parent_debate_id": 1,
  "follow_up_question": "如果只考虑没有专职运维团队的初创公司，这个结论还成立吗？",
  "status": "pending"
}
```

错误状态：

- `404`：父辩论不存在。
- `409`：父辩论尚未完成，不能继续追问。
- `422`：问题为空、超长或请求字段不符合 schema。

相同父辩论、追问和有效配置的活动请求会复用已经处于 `pending` 或 `running` 的子辩论，减少前端重复提交导致的重复后台任务。极端并发下当前没有数据库唯一约束或显式幂等键。

`stage` 枚举顺序：

文章辩论使用完整 9 阶段：

1. `moderator_opening`
2. `pro_opening`
3. `con_opening`
4. `pro_rebuttal`
5. `con_rebuttal`
6. `moderator_midpoint`
7. `pro_closing`
8. `con_closing`
9. `judge_report`

快速话题辩论使用 5 阶段：

1. `moderator_opening`
2. `pro_opening`
3. `con_opening`
4. `moderator_midpoint`
5. `judge_report`

`winner` 枚举：

- `pro`
- `con`
- `mixed`
