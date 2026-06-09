import type { AgentMessageRead } from "@/lib/types";
import { AgentMessageCard } from "./agent-message-card";

type DebateStageProps = {
  messages: AgentMessageRead[];
};

const STAGE_ORDER = [
  "moderator_opening",
  "pro_opening",
  "con_opening",
  "pro_rebuttal",
  "con_rebuttal",
  "moderator_midpoint",
  "pro_closing",
  "con_closing",
  "judge_report",
] as const;

const STAGE_LABELS: Record<string, string> = {
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

export function DebateStage({ messages }: DebateStageProps) {
  const messagesByStage = new Map<string, AgentMessageRead[]>();

  for (const message of messages) {
    const stageMessages = messagesByStage.get(String(message.stage)) ?? [];
    stageMessages.push(message);
    messagesByStage.set(String(message.stage), stageMessages);
  }

  return (
    <div className="space-y-4">
      {STAGE_ORDER.map((stage, index) => {
        const stageMessages = messagesByStage.get(String(stage)) ?? [];
        const isComplete = stageMessages.length > 0;

        return (
          <section
            className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-[11rem_minmax(0,1fr)]"
            key={String(stage)}
          >
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={[
                    "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
                    isComplete
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 bg-slate-50 text-slate-500",
                  ].join(" ")}
                >
                  {index + 1}
                </span>
                <h3 className="text-sm font-semibold text-slate-900">
                  {STAGE_LABELS[String(stage)]}
                </h3>
              </div>
            </div>

            <div className="min-w-0 space-y-3">
              {stageMessages.length > 0 ? (
                stageMessages.map((message) => (
                  <AgentMessageCard key={message.id} message={message} />
                ))
              ) : (
                <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm leading-6 text-slate-500">
                  等待该阶段输出。
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
