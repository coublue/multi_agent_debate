import { DebateStatus } from "@/components/debate-status";
import type {
  AgentMessageRead,
  DebateDetailRead,
  DebateStage,
  DebateStatus as DebateStatusValue,
  Winner,
} from "@/lib/types";
import { STAGE_LABELS } from "./debate-stage-progress";

type DebateSummaryPanelProps = {
  debate: DebateDetailRead;
  isTopicDebate: boolean;
  stageOrder: DebateStage[];
  visibleMessageCount: number;
  onRerun?: () => void;
  rerunning?: boolean;
};

const WINNER_TEXT: Record<Winner, string> = {
  pro: "正方",
  con: "反方",
  mixed: "综合结论",
  balanced: "均衡结论",
};

const STATUS_TEXT: Record<DebateStatusValue, string> = {
  pending: "等待开始",
  running: "正在生成",
  completed: "已完成",
  failed: "运行失败",
};

export function DebateSummaryPanel({
  debate,
  isTopicDebate,
  onRerun,
  rerunning = false,
  stageOrder,
  visibleMessageCount,
}: DebateSummaryPanelProps) {
  const completedStages = new Set(
    debate.messages
      .map((message) => message.stage)
      .filter((stage) => stageOrder.includes(stage)),
  );
  const completedCount = stageOrder.filter((stage) =>
    completedStages.has(stage),
  ).length;
  const progressPercent =
    stageOrder.length > 0 ? Math.round((completedCount / stageOrder.length) * 100) : 0;
  const currentStage = getCurrentStage(stageOrder, completedStages, debate.status);
  const proStrongest = getStrongestClaim(debate, "pro");
  const conStrongest = getStrongestClaim(debate, "con");

  return (
    <section className="mb-5 rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-2 text-sm font-medium text-slate-500">
            辩论 #{debate.id}
          </p>
          <div className="flex flex-wrap items-start gap-3">
            <h1 className="max-w-4xl break-words text-2xl font-semibold text-slate-950 sm:text-3xl">
              {debate.article.title}
            </h1>
            <span
              className={[
                "mt-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
                isTopicDebate
                  ? "border-violet-200 bg-violet-50 text-violet-700"
                  : "border-sky-200 bg-sky-50 text-sky-700",
              ].join(" ")}
            >
              {isTopicDebate ? "话题辩论" : "文章辩论"}
            </span>
          </div>
        </div>
        <DebateStatus status={debate.status} />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="辩论类型" value={isTopicDebate ? "话题辩论" : "文章辩论"} />
        <Metric label="当前状态" value={STATUS_TEXT[debate.status]} />
        <Metric
          label="阶段完成度"
          value={`${completedCount}/${stageOrder.length}`}
          detail={`${progressPercent}% · ${visibleMessageCount} 条输出`}
        />
        <Metric
          label="裁判结论"
          value={debate.winner ? WINNER_TEXT[debate.winner] : "尚未生成"}
          detail={
            typeof debate.credibility_score === "number"
              ? `可信度 ${debate.credibility_score}/100`
              : "可信度待生成"
          }
        />
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={[
            "h-full rounded-full transition-all",
            debate.status === "failed" ? "bg-red-500" : "bg-blue-600",
          ].join(" ")}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <ClaimBlock label="正方最强观点" tone="pro" value={proStrongest} />
        <ClaimBlock label="反方最强观点" tone="con" value={conStrongest} />
      </div>

      {currentStage ? (
        <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          当前阶段：{STAGE_LABELS[currentStage]}
        </p>
      ) : null}

      {debate.status === "failed" ? (
        <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-red-950">
                辩论运行失败
              </h2>
              <p className="mt-1 break-words leading-6">
                {debate.error_message ||
                  "可以清空旧阶段消息和失败结果，从第一阶段重新运行整场辩论。"}
              </p>
            </div>
            {onRerun ? (
              <button
                className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-red-300"
                disabled={rerunning}
                onClick={onRerun}
                type="button"
              >
                {rerunning ? "重新运行中..." : "重新运行整场辩论"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Metric({
  detail,
  label,
  value,
}: {
  detail?: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-1 break-words text-lg font-semibold text-slate-950">
        {value}
      </div>
      {detail ? (
        <div className="mt-1 break-words text-xs leading-5 text-slate-500">
          {detail}
        </div>
      ) : null}
    </div>
  );
}

function ClaimBlock({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "pro" | "con";
  value: string | null;
}) {
  const styles =
    tone === "pro"
      ? "border-emerald-200 bg-emerald-50 text-emerald-950"
      : "border-amber-200 bg-amber-50 text-amber-950";

  return (
    <section className={`rounded-md border p-4 ${styles}`}>
      <h2 className="mb-2 text-sm font-semibold">{label}</h2>
      <p className="break-words text-sm leading-6">
        {value || "暂无结构化摘要。"}
      </p>
    </section>
  );
}

function getCurrentStage(
  stageOrder: DebateStage[],
  completedStages: Set<DebateStage>,
  status: DebateStatusValue,
) {
  if (status === "completed") {
    return null;
  }

  return stageOrder.find((stage) => !completedStages.has(stage)) ?? null;
}

function getStrongestClaim(debate: DebateDetailRead, role: "pro" | "con") {
  const reportClaims =
    role === "pro"
      ? debate.final_report?.pro_strongest_points
      : debate.final_report?.con_strongest_points;

  if (reportClaims?.[0]) {
    return reportClaims[0];
  }

  const candidates = debate.messages
    .filter((message) => String(message.agent_role) === role)
    .slice()
    .reverse();

  for (const message of candidates) {
    const claim = getStringField(message, "strongest_claim");
    if (claim) {
      return claim;
    }
  }

  return null;
}

function getStringField(message: AgentMessageRead, field: string) {
  const value = message.content[field];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
