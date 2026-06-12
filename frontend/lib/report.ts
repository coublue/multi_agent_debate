import type { AgentMessageRead, DebateDetailRead, DebateStage, DebateStatus, Winner } from "./types";

type PlainRecord = Record<string, unknown>;

const STATUS_LABELS: Record<DebateStatus, string> = {
  pending: "等待中",
  running: "运行中",
  completed: "已完成",
  failed: "失败",
};

const WINNER_LABELS: Record<Winner, string> = {
  pro: "正方",
  con: "反方",
  mixed: "综合结论",
  balanced: "均衡结论",
};

const STAGE_LABELS: Record<DebateStage, string> = {
  moderator_opening: "主持人开场",
  pro_opening: "正方开篇",
  con_opening: "反方开篇",
  pro_rebuttal: "正方反驳",
  con_rebuttal: "反方反驳",
  moderator_midpoint: "主持人中场梳理",
  pro_closing: "正方总结",
  con_closing: "反方总结",
  judge_report: "裁判报告",
};

const ROLE_LABELS: Record<string, string> = {
  moderator: "主持人",
  pro: "正方",
  con: "反方",
  judge: "裁判",
};

const VALUE_LABELS: Record<string, string> = {
  article_9: "文章 9 阶段",
  balanced: "均衡结论",
  completed: "已完成",
  con: "反方",
  concise: "简洁",
  deep: "深度",
  detailed: "详细",
  failed: "失败",
  mixed: "综合结论",
  pending: "排队中",
  pro: "正方",
  quick: "快速",
  running: "运行中",
  standard: "标准",
  topic_3: "话题 3 阶段极简",
  topic_5: "话题 5 阶段标准",
};

const AGENT_NAME_LABELS: Record<string, string> = {
  ConAgent: "反方 Agent",
  JudgeAgent: "裁判 Agent",
  ModeratorAgent: "主持人 Agent",
  ProAgent: "正方 Agent",
  con: "反方 Agent",
  judge: "裁判 Agent",
  moderator: "主持人 Agent",
  pro: "正方 Agent",
};

const FIELD_LABELS: Record<string, string> = {
  summary: "摘要",
  content: "正文",
  main_claim: "核心主张",
  debate_topic: "辩题",
  key_points: "关键观点",
  controversial_points: "争议点",
  rules: "讨论规则",
  argument: "论证",
  evidence: "证据",
  evidenceFromArticle: "文章证据",
  evidence_from_article: "文章证据",
  "Evidence From Article": "文章证据",
  "Evidence from Article": "文章证据",
  evidence_from_text: "原文证据",
  reasoning: "推理",
  rebuttal: "反驳",
  keyObjections: "关键反对意见",
  key_objections: "关键反对意见",
  "Key Objections": "关键反对意见",
  strongest_claim: "最强论点",
  supporting_reasons: "支持理由",
  weaknesses: "薄弱点",
  knownLimits: "已知限制",
  known_limits: "已知限制",
  "Known Limits": "已知限制",
  evidence_assessment: "证据评估",
  pro_points: "正方观点",
  con_points: "反方观点",
  limits: "边界说明",
  pro_summary: "正方阶段总结",
  con_summary: "反方阶段总结",
  key_disagreements: "关键分歧",
  unresolved_questions: "未解决问题",
  focus_for_closing: "总结阶段关注点",
  debate_focus: "辩论焦点",
  disagreement_map: "争议点矩阵",
  issue: "争议点",
  pro_position: "正方立场",
  con_position: "反方立场",
  winner: "结论方",
  credibility_score: "可信度评分",
  verdict: "裁判结论",
  decision_basis: "判定依据",
  credible_parts: "可信部分",
  questionable_parts: "存疑部分",
  final_summary: "最终总结",
};

const OMITTED_REPORT_KEYS = new Set([
  "follow_up_questions",
  "follow_up_question",
  "follow_up",
  "next_questions",
]);

export function generateDebateMarkdown(debate: DebateDetailRead, generatedAt = new Date()): string {
  const isTopicDebate = debate.article.source === "topic";
  const report = debate.final_report;
  const judgeFallback = getLatestMessageByRole(debate.messages, "judge")?.content;
  const moderatorFallback = getLatestMessageByRole(debate.messages, "moderator")?.content;

  const title = debate.article.title || debate.debate_topic || `辩论 #${debate.id}`;
  const verdict = firstText(
    getRecordValue(report, "verdict"),
    getRecordValue(judgeFallback, "verdict"),
    report?.final_summary,
    getRecordValue(judgeFallback, "final_summary"),
    debate.winner ? `${WINNER_LABELS[debate.winner]}更具说服力` : null,
  );
  const credibility = firstNumber(
    debate.credibility_score,
    report?.credibility_score,
    getRecordValue(judgeFallback, "credibility_score"),
  );
  const winner = firstText(
    debate.winner ? WINNER_LABELS[debate.winner] : null,
    report?.winner ? WINNER_LABELS[report.winner] : null,
    getRecordValue(judgeFallback, "winner"),
  );

  const proPoints = uniqueStrings([
    ...stringsFromUnknown(report?.pro_strongest_points),
    ...collectRoleHighlights(debate.messages, "pro"),
  ]);
  const conPoints = uniqueStrings([
    ...stringsFromUnknown(report?.con_strongest_points),
    ...collectRoleHighlights(debate.messages, "con"),
  ]);
  const disagreements = uniqueStrings([
    ...stringsFromUnknown(report?.key_disagreements),
    ...stringsFromUnknown(getRecordValue(moderatorFallback, "key_disagreements")),
    ...stringsFromUnknown(getRecordValue(judgeFallback, "key_disagreements")),
    ...collectDisagreementIssues(debate.messages),
  ]);

  return [
    `# ${escapeMarkdown(title)}`,
    "",
    "## 基本信息",
    "",
    table([
      ["辩论 ID", String(debate.id)],
      ["辩论类型", isTopicDebate ? "话题辩论" : "文章辩论"],
      ["状态", STATUS_LABELS[debate.status] ?? debate.status],
      ["结论方", winner || "暂无"],
      ["可信度", credibility === null ? "暂无" : `${credibility}/100`],
      ["创建时间", formatDate(debate.created_at)],
      ["更新时间", formatDate(debate.updated_at)],
      ["报告生成时间", formatDate(generatedAt.toISOString())],
    ]),
    "",
    `## ${isTopicDebate ? "话题背景" : "原文"}`,
    "",
    isTopicDebate ? textOrFallback(debate.article.content) : sourceBlock(debate),
    "",
    "## 关注问题",
    "",
    textOrFallback(debate.article.user_question),
    "",
    "## 裁判结论",
    "",
    textOrFallback(verdict),
    "",
    "## 正方关键观点",
    "",
    bulletList(proPoints),
    "",
    "## 反方关键观点",
    "",
    bulletList(conPoints),
    "",
    "## 关键分歧",
    "",
    bulletList(disagreements),
    "",
    "## 阶段记录",
    "",
    stageRecords(debate.messages),
    "",
  ].join("\n");
}

export function buildDebateMarkdownFilename(debate: DebateDetailRead): string {
  const title = debate.article.title || debate.debate_topic || `debate-${debate.id}`;
  const safeTitle = title
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return `debate-${debate.id}-${safeTitle || "report"}.md`;
}

function sourceBlock(debate: DebateDetailRead) {
  const parts: string[] = [];

  if (debate.article.source) {
    parts.push(`来源：${debate.article.source}`);
    parts.push("");
  }

  parts.push(textOrFallback(debate.article.content));
  return parts.join("\n");
}

function stageRecords(messages: AgentMessageRead[]) {
  const sortedMessages = [...messages].sort((left, right) => {
    if (left.round_index !== right.round_index) {
      return left.round_index - right.round_index;
    }
    return left.id - right.id;
  });

  if (sortedMessages.length === 0) {
    return "暂无阶段记录。";
  }

  return sortedMessages
    .map((message, index) => {
      const title = `${index + 1}. ${STAGE_LABELS[message.stage] ?? message.stage} - ${
        ROLE_LABELS[message.agent_role] ?? message.agent_role
      }`;
      return [
        `### ${title}`,
        "",
        `- Agent：${formatAgentName(message.agent_name, message.agent_role)}`,
        `- 时间：${formatDate(message.created_at)}`,
        "",
        contentToMarkdown(message.content),
      ].join("\n");
    })
    .join("\n\n");
}

function contentToMarkdown(value: unknown, depth = 0): string {
  const sanitized = sanitizeReportValue(value);

  if (sanitized === null || sanitized === undefined) {
    return "暂无内容。";
  }

  if (typeof sanitized === "string") {
    return VALUE_LABELS[sanitized] ?? sanitized;
  }

  if (typeof sanitized === "number" || typeof sanitized === "boolean") {
    return String(sanitized);
  }

  if (Array.isArray(sanitized)) {
    if (sanitized.length === 0) {
      return "暂无内容。";
    }

    return sanitized
      .map((item) => {
        const rendered = contentToMarkdown(item, depth + 1).replace(/\n/g, "\n  ");
        return `- ${rendered}`;
      })
      .join("\n");
  }

  if (isPlainRecord(sanitized)) {
    const entries = Object.entries(sanitized);
    if (entries.length === 0) {
      return "暂无内容。";
    }

    return entries
      .map(([key, item]) => {
        const label = FIELD_LABELS[key] ?? labelize(key);
        const rendered = contentToMarkdown(item, depth + 1);
        if (isPrimitive(item)) {
          return `- ${label}：${rendered}`;
        }
        return [`- ${label}：`, indent(rendered)].join("\n");
      })
      .join("\n");
  }

  return String(sanitized);
}

function formatAgentName(name: string, role: string) {
  return AGENT_NAME_LABELS[name] ?? AGENT_NAME_LABELS[role] ?? (name || "未知");
}

function sanitizeReportValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeReportValue);
  }

  if (isPlainRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !OMITTED_REPORT_KEYS.has(key))
        .map(([key, item]) => [key, sanitizeReportValue(item)]),
    );
  }

  return value;
}

function collectRoleHighlights(messages: AgentMessageRead[], role: "pro" | "con") {
  return messages
    .filter((message) => message.agent_role === role)
    .flatMap((message) => [
      ...stringsFromUnknown(getRecordValue(message.content, "strongest_claim")),
      ...stringsFromUnknown(getRecordValue(message.content, "key_points")),
      ...stringsFromUnknown(getRecordValue(message.content, "supporting_reasons")),
      ...stringsFromUnknown(getRecordValue(message.content, "argument")),
      ...stringsFromUnknown(getRecordValue(message.content, "summary")),
    ])
    .filter(Boolean);
}

function collectDisagreementIssues(messages: AgentMessageRead[]) {
  return messages.flatMap((message) => {
    const direct = stringsFromUnknown(getRecordValue(message.content, "key_disagreements"));
    const map = getRecordValue(message.content, "disagreement_map");

    if (!Array.isArray(map)) {
      return direct;
    }

    const mappedIssues = map.flatMap((item) => {
      if (!isPlainRecord(item)) {
        return stringsFromUnknown(item);
      }
      const issue = firstText(item.issue);
      const pro = firstText(item.pro_position);
      const con = firstText(item.con_position);
      if (!issue) {
        return [];
      }
      return pro || con ? [`${issue}（正方：${pro || "暂无"}；反方：${con || "暂无"}）`] : [issue];
    });

    return [...direct, ...mappedIssues];
  });
}

function getLatestMessageByRole(messages: AgentMessageRead[], role: string) {
  return [...messages]
    .reverse()
    .find((message) => message.agent_role === role);
}

function getRecordValue(record: unknown, key: string): unknown {
  if (!isPlainRecord(record)) {
    return undefined;
  }
  return record[key];
}

function stringsFromUnknown(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (typeof value === "string") {
    return value.trim() ? [value.trim()] : [];
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap(stringsFromUnknown);
  }

  if (isPlainRecord(value)) {
    return Object.values(value).flatMap(stringsFromUnknown);
  }

  return [];
}

function firstText(...values: unknown[]) {
  return stringsFromUnknown(values).find(Boolean) ?? null;
}

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function bulletList(items: string[]) {
  if (items.length === 0) {
    return "暂无内容。";
  }

  return items.map((item) => `- ${item}`).join("\n");
}

function table(rows: Array<[string, string]>) {
  return [
    "| 字段 | 内容 |",
    "| --- | --- |",
    ...rows.map(([label, value]) => `| ${escapeTableCell(label)} | ${escapeTableCell(value)} |`),
  ].join("\n");
}

function textOrFallback(value?: string | null) {
  return value?.trim() ? value.trim() : "暂无内容。";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function escapeMarkdown(value: string) {
  return value.replace(/^#/g, "\\#");
}

function escapeTableCell(value: string) {
  return value.replaceAll("|", "\\|").replace(/\r?\n/g, "<br>");
}

function labelize(value: string) {
  if (FIELD_LABELS[value]) {
    return FIELD_LABELS[value];
  }

  const normalized = value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/\s+/g, "_")
    .toLowerCase();
  if (FIELD_LABELS[normalized]) {
    return FIELD_LABELS[normalized];
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function indent(value: string) {
  return value
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");
}

function isPrimitive(value: unknown) {
  return value === null || value === undefined || ["string", "number", "boolean"].includes(typeof value);
}

function isPlainRecord(value: unknown): value is PlainRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
