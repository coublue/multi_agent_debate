import type { ReactNode } from "react";
import type { AgentMessageRead } from "@/lib/types";

type AgentMessageCardProps = {
  message: AgentMessageRead;
};

type ContentValue =
  | string
  | number
  | boolean
  | null
  | ContentValue[]
  | { [key: string]: ContentValue };

const ROLE_STYLES: Record<string, string> = {
  moderator: "border-blue-200 bg-blue-50/60 text-blue-950",
  pro: "border-emerald-200 bg-emerald-50/60 text-emerald-950",
  con: "border-amber-200 bg-amber-50/70 text-amber-950",
  judge: "border-violet-200 bg-violet-50/60 text-violet-950",
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

export function AgentMessageCard({ message }: AgentMessageCardProps) {
  const role = String(message.agent_role);

  return (
    <article
      className={[
        "rounded-md border p-4 shadow-sm",
        ROLE_STYLES[role] ?? "border-slate-200 bg-white text-slate-950",
      ].join(" ")}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold">
            {ROLE_LABELS[role] ?? labelize(role)}
          </div>
          <div className="break-words text-xs text-slate-500">
            {message.agent_name}
          </div>
        </div>
        <div className="rounded-full border border-current/20 px-2 py-1 text-xs font-medium">
          {labelize(String(message.stage))}
        </div>
      </div>

      <div className="min-w-0 text-slate-900">
        {renderContent(message.content as ContentValue)}
      </div>
    </article>
  );
}
