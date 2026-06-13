"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { AgentMessageRead } from "@/lib/types";

type AgentMessageCardProps = {
  message: AgentMessageRead;
  defaultCollapsed?: boolean;
};

type ContentValue =
  | string
  | number
  | boolean
  | null
  | ContentValue[]
  | { [key: string]: ContentValue };

const ROLE_STYLES: Record<
  string,
  {
    card: string;
    badge: string;
    accent: string;
    button: string;
    muted: string;
  }
> = {
  moderator: {
    card: "border-sky-400/25 bg-sky-400/10 text-sky-50",
    badge: "border-sky-300/30 bg-sky-300/10 text-sky-100",
    accent: "bg-sky-400",
    button: "text-sky-100 hover:bg-sky-300/10 hover:text-white",
    muted: "text-sky-100/65",
  },
  pro: {
    card: "border-emerald-400/25 bg-emerald-400/10 text-emerald-50",
    badge: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
    accent: "bg-emerald-400",
    button: "text-emerald-100 hover:bg-emerald-300/10 hover:text-white",
    muted: "text-emerald-100/65",
  },
  con: {
    card: "border-amber-400/25 bg-amber-400/10 text-amber-50",
    badge: "border-amber-300/30 bg-amber-300/10 text-amber-100",
    accent: "bg-amber-400",
    button: "text-amber-100 hover:bg-amber-300/10 hover:text-white",
    muted: "text-amber-100/65",
  },
  judge: {
    card: "border-violet-400/30 bg-violet-500/10 text-violet-50",
    badge: "border-violet-300/30 bg-violet-300/10 text-violet-100",
    accent: "bg-violet-400",
    button: "text-violet-100 hover:bg-violet-300/10 hover:text-white",
    muted: "text-violet-100/65",
  },
};

const FALLBACK_STYLE = {
  card: "border-slate-700 bg-slate-900 text-slate-100",
  badge: "border-slate-700 bg-slate-800 text-slate-300",
  accent: "bg-slate-500",
  button: "text-slate-300 hover:bg-slate-800 hover:text-white",
  muted: "text-slate-500",
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
  running: "辩论中",
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
  main_claim: "核心主张",
  debate_topic: "辩题",
  key_points: "关键论点",
  controversial_points: "争议点",
  content: "完整发言",
  rules: "讨论规则",
  argument: "论证",
  evidence: "证据",
  evidenceFromArticle: "文章证据",
  evidence_from_article: "文章证据",
  "Evidence From Article": "文章证据",
  "Evidence from Article": "文章证据",
  evidence_from_text: "原文证据",
  reasoning: "推理",
  keyObjections: "关键反对意见",
  key_objections: "关键反对意见",
  "Key Objections": "关键反对意见",
  strongest_claim: "最强论点",
  supporting_reasons: "支持理由",
  weaknesses: "薄弱点",
  knownLimits: "已知限制",
  known_limits: "已知限制",
  "Known Limits": "已知限制",
  evidence_assessment: "证据质量判断",
  rebuttal: "反驳",
  summary: "总结",
  pro_points: "正方观点",
  con_points: "反方观点",
  debate_focus: "辩论焦点",
  disagreement_map: "争议点矩阵",
  issue: "争议点",
  pro_position: "正方立场",
  con_position: "反方立场",
  limits: "边界说明",
  pro_summary: "正方阶段总结",
  con_summary: "反方阶段总结",
  key_disagreements: "关键分歧",
  unresolved_questions: "未解决问题",
  focus_for_closing: "总结阶段关注点",
  winner: "结论方",
  verdict: "最终结论",
  decision_basis: "判定依据",
  credibility_score: "可信度评分",
  credible_parts: "可信部分",
  questionable_parts: "存疑部分",
  follow_up_questions: "后续问题",
  final_summary: "最终总结",
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

function renderContent(value: ContentValue, keyPrefix = "content"): ReactNode {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <p className="text-sm text-slate-500">暂无内容</p>;
    }

    return (
      <ul className="list-disc space-y-1 break-words pl-5 text-sm leading-6 text-slate-200">
        {value.map((item, index) => (
          <li key={`${keyPrefix}-${index}`}>
            {item && typeof item === "object"
              ? renderContent(item, `${keyPrefix}-${index}`)
              : renderInlineValue(item)}
          </li>
        ))}
      </ul>
    );
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value);

    if (entries.length === 0) {
      return <p className="text-sm text-slate-500">暂无结构化内容。</p>;
    }

    return (
      <div className="space-y-3">
        {entries.map(([key, item]) => (
          <div key={`${keyPrefix}-${key}`}>
            <div className="mb-1 text-xs font-semibold text-slate-400">
              {labelize(key)}
            </div>
            {renderContent(item, `${keyPrefix}-${key}`)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <p className="break-words text-sm leading-6 text-slate-200">
      {renderInlineValue(value)}
    </p>
  );
}

function renderInlineValue(value: ContentValue) {
  if (value === null) {
    return "无";
  }

  if (typeof value === "boolean") {
    return value ? "是" : "否";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  const text = String(value);
  return VALUE_LABELS[text] ?? text;
}

function getSummary(content: Record<string, unknown>) {
  const values = Object.values(content);
  const firstText = values.find((value) => typeof value === "string");

  if (typeof firstText === "string" && firstText.trim()) {
    return firstText.trim();
  }

  return "结构化发言内容";
}

function formatAgentName(name: string, role: string) {
  return AGENT_NAME_LABELS[name] ?? AGENT_NAME_LABELS[role] ?? name;
}

export function AgentMessageCard({
  message,
  defaultCollapsed = false,
}: AgentMessageCardProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const role = String(message.agent_role);
  const style = ROLE_STYLES[role] ?? FALLBACK_STYLE;
  const summary = useMemo(() => getSummary(message.content), [message.content]);

  return (
    <article
      className={[
        "overflow-hidden rounded-md border shadow-sm shadow-black/20",
        style.card,
      ].join(" ")}
    >
      <div className="grid grid-cols-[4px_minmax(0,1fr)]">
        <div className={style.accent} aria-hidden="true" />
        <div className="min-w-0 p-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">
                  {ROLE_LABELS[role] ?? labelize(role)}
                </span>
                <span
                  className={[
                    "rounded-full border px-2 py-0.5 text-xs font-medium",
                    style.badge,
                  ].join(" ")}
                >
                  {labelize(String(message.stage))}
                </span>
              </div>
              <div className={["mt-1 break-words text-xs", style.muted].join(" ")}>
                {formatAgentName(message.agent_name, role)}
              </div>
            </div>

            <button
              aria-expanded={!collapsed}
              className={[
                "min-h-8 rounded-md px-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 focus:ring-offset-slate-950",
                style.button,
              ].join(" ")}
              onClick={() => setCollapsed((value) => !value)}
              type="button"
            >
              {collapsed ? "展开" : "折叠"}
            </button>
          </div>

          {collapsed ? (
            <p className="line-clamp-2 break-words text-sm leading-6 text-slate-300">
              {summary}
            </p>
          ) : (
            <div className="min-w-0 text-slate-100">
              {renderContent(message.content as ContentValue)}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
