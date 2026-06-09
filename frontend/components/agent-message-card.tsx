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
  }
> = {
  moderator: {
    card: "border-blue-200 bg-blue-50/70 text-blue-950",
    badge: "border-blue-200 bg-white/75 text-blue-800",
    accent: "bg-blue-500",
    button: "text-blue-800 hover:text-blue-950",
  },
  pro: {
    card: "border-emerald-200 bg-emerald-50/70 text-emerald-950",
    badge: "border-emerald-200 bg-white/75 text-emerald-800",
    accent: "bg-emerald-500",
    button: "text-emerald-800 hover:text-emerald-950",
  },
  con: {
    card: "border-amber-200 bg-amber-50/80 text-amber-950",
    badge: "border-amber-200 bg-white/75 text-amber-800",
    accent: "bg-amber-500",
    button: "text-amber-800 hover:text-amber-950",
  },
  judge: {
    card: "border-rose-200 bg-rose-50/70 text-rose-950",
    badge: "border-rose-200 bg-white/75 text-rose-800",
    accent: "bg-rose-500",
    button: "text-rose-800 hover:text-rose-950",
  },
};

const FALLBACK_STYLE = {
  card: "border-slate-200 bg-white text-slate-950",
  badge: "border-slate-200 bg-slate-50 text-slate-700",
  accent: "bg-slate-400",
  button: "text-slate-700 hover:text-slate-950",
};

const ROLE_LABELS: Record<string, string> = {
  moderator: "主持人",
  pro: "正方",
  con: "反方",
  judge: "裁判",
};

const FIELD_LABELS: Record<string, string> = {
  main_claim: "核心主张",
  debate_topic: "辩题",
  key_points: "关键论点",
  controversial_points: "争议点",
  rules: "讨论规则",
  argument: "论证",
  evidence: "证据",
  reasoning: "推理",
  rebuttal: "反驳",
  summary: "总结",
  pro_points: "正方观点",
  con_points: "反方观点",
  limits: "边界说明",
  pro_summary: "正方阶段总结",
  con_summary: "反方阶段总结",
  key_disagreements: "关键分歧",
  unresolved_questions: "未解决问题",
  focus_for_closing: "总结阶段关注点",
  winner: "结论方",
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
      <ul className="list-disc space-y-1 break-words pl-5 text-sm leading-6">
        {value.map((item, index) => (
          <li key={`${keyPrefix}-${index}`}>{renderInlineValue(item)}</li>
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
            <div className="mb-1 text-xs font-semibold text-slate-500">
              {labelize(key)}
            </div>
            {renderContent(item, `${keyPrefix}-${key}`)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <p className="break-words text-sm leading-6">{renderInlineValue(value)}</p>
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

  return String(value);
}

function getSummary(content: Record<string, unknown>) {
  const values = Object.values(content);
  const firstText = values.find((value) => typeof value === "string");

  if (typeof firstText === "string" && firstText.trim()) {
    return firstText.trim();
  }

  return "结构化发言内容";
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
        "overflow-hidden rounded-md border shadow-sm",
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
              <div className="mt-1 break-words text-xs text-slate-500">
                {message.agent_name}
              </div>
            </div>

            <button
              aria-expanded={!collapsed}
              className={[
                "min-h-8 rounded-md px-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
                style.button,
              ].join(" ")}
              onClick={() => setCollapsed((value) => !value)}
              type="button"
            >
              {collapsed ? "展开" : "折叠"}
            </button>
          </div>

          {collapsed ? (
            <p className="line-clamp-2 break-words text-sm leading-6 text-slate-600">
              {summary}
            </p>
          ) : (
            <div className="min-w-0 text-slate-900">
              {renderContent(message.content as ContentValue)}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
