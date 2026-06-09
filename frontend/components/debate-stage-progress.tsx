import type {
  AgentMessageRead,
  DebateStage as DebateStageValue,
  DebateStatus,
} from "@/lib/types";

type StageProgressState = "completed" | "current" | "pending" | "failed";
export type DebateStageMode = "article" | "topic";

type DebateStageProgressProps = {
  messages: AgentMessageRead[];
  mode?: DebateStageMode;
  status: DebateStatus;
};

export const ARTICLE_STAGE_ORDER: DebateStageValue[] = [
  "moderator_opening",
  "pro_opening",
  "con_opening",
  "pro_rebuttal",
  "con_rebuttal",
  "moderator_midpoint",
  "pro_closing",
  "con_closing",
  "judge_report",
];

export const TOPIC_STAGE_ORDER: DebateStageValue[] = [
  "moderator_opening",
  "pro_opening",
  "con_opening",
  "moderator_midpoint",
  "judge_report",
];

export const STAGE_LABELS: Record<DebateStageValue, string> = {
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

const STATE_LABELS: Record<StageProgressState, string> = {
  completed: "已完成",
  current: "进行中",
  pending: "等待中",
  failed: "已中断",
};

const STATE_STYLES: Record<StageProgressState, string> = {
  completed: "border-emerald-300 bg-emerald-50 text-emerald-800",
  current: "border-blue-300 bg-blue-50 text-blue-800",
  pending: "border-slate-200 bg-white text-slate-500",
  failed: "border-red-300 bg-red-50 text-red-800",
};

const DOT_STYLES: Record<StageProgressState, string> = {
  completed: "border-emerald-600 bg-emerald-600 text-white",
  current: "border-blue-600 bg-blue-600 text-white",
  pending: "border-slate-300 bg-slate-50 text-slate-500",
  failed: "border-red-600 bg-red-600 text-white",
};

export function getStageOrder(mode: DebateStageMode = "article") {
  return mode === "topic" ? TOPIC_STAGE_ORDER : ARTICLE_STAGE_ORDER;
}

export function DebateStageProgress({
  messages,
  mode = "article",
  status,
}: DebateStageProgressProps) {
  const stageOrder = getStageOrder(mode);
  const expectedStages = new Set(stageOrder);
  const completedStages = new Set(
    messages
      .map((message) => message.stage)
      .filter((stage) => expectedStages.has(stage)),
  );
  const firstIncompleteIndex = stageOrder.findIndex(
    (stage) => !completedStages.has(stage),
  );
  const currentIndex =
    firstIncompleteIndex === -1 ? stageOrder.length - 1 : firstIncompleteIndex;
  const completedCount = stageOrder.filter((stage) =>
    completedStages.has(stage),
  ).length;

  return (
    <section className="mb-5 rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">辩论进度</h2>
          <p className="mt-1 text-sm text-slate-500">
            已完成 {completedCount}/{stageOrder.length} 个阶段
          </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
          {getProgressSummary(status, completedCount)}
        </span>
      </div>

      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stageOrder.map((stage, index) => {
          const stageState = getStageState({
            completedStages,
            currentIndex,
            index,
            stage,
            status,
          });

          return (
            <li
              className={[
                "flex min-h-20 items-start gap-3 rounded-md border p-3 transition",
                STATE_STYLES[stageState],
              ].join(" ")}
              key={stage}
            >
              <span
                className={[
                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  DOT_STYLES[stageState],
                ].join(" ")}
              >
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="block break-words text-sm font-semibold">
                  {STAGE_LABELS[stage]}
                </span>
                <span className="mt-1 block text-xs">
                  {STATE_LABELS[stageState]}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function getStageState({
  completedStages,
  currentIndex,
  index,
  stage,
  status,
}: {
  completedStages: Set<DebateStageValue>;
  currentIndex: number;
  index: number;
  stage: DebateStageValue;
  status: DebateStatus;
}): StageProgressState {
  if (completedStages.has(stage)) {
    return "completed";
  }

  if (status === "failed" && index === currentIndex) {
    return "failed";
  }

  if ((status === "pending" || status === "running") && index === currentIndex) {
    return "current";
  }

  return "pending";
}

function getProgressSummary(status: DebateStatus, completedCount: number) {
  if (status === "completed") {
    return "辩论已完成";
  }

  if (status === "failed") {
    return completedCount > 0 ? "辩论已中断" : "启动失败";
  }

  if (status === "pending") {
    return "等待开始";
  }

  return "正在生成";
}
