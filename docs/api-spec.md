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
    "created_at": "2026-06-07T10:00:00"
  }
]
```

### GET `/api/articles/{article_id}`

读取单篇文章详情。

响应字段同 `ArticleRead`：`id`、`title`、`source`、`content`、`user_question`、`created_at`、`updated_at`。

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

`stage` 枚举顺序：

1. `moderator_opening`
2. `pro_opening`
3. `con_opening`
4. `pro_rebuttal`
5. `con_rebuttal`
6. `moderator_midpoint`
7. `pro_closing`
8. `con_closing`
9. `judge_report`

`winner` 枚举：

- `pro`
- `con`
- `mixed`

