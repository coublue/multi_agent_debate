"use client";

import { useMemo, useState } from "react";

import type { AgentMessageRead } from "@/lib/types";
import { AgentFilter, type AgentRoleFilter } from "./agent-filter";
import { AgentMessageCard } from "./agent-message-card";
import {
  type DebateStageMode,
  getStageOrder,
  STAGE_LABELS,
} from "./debate-stage-progress";

type DebateStageProps = {
  messages: AgentMessageRead[];
  mode?: DebateStageMode;
};

function matchesFilter(message: AgentMessageRead, filter: AgentRoleFilter) {
  return filter === "all" || String(message.agent_role) === filter;
}

function getAgentCounts(messages: AgentMessageRead[]) {
  const counts: Partial<Record<AgentRoleFilter, number>> = {
    all: messages.length,
    moderator: 0,
    pro: 0,
    con: 0,
    judge: 0,
  };

  for (const message of messages) {
    const role = String(message.agent_role) as AgentRoleFilter;
    if (role in counts) {
      counts[role] = (counts[role] ?? 0) + 1;
    }
  }

  return counts;
}

export function DebateStage({ messages, mode = "article" }: DebateStageProps) {
  const [roleFilter, setRoleFilter] = useState<AgentRoleFilter>("all");
  const stageOrder = useMemo(() => getStageOrder(mode), [mode]);
  const visibleStages = useMemo(() => new Set(stageOrder), [stageOrder]);
  const visibleMessages = useMemo(
    () => messages.filter((message) => visibleStages.has(message.stage)),
    [messages, visibleStages],
  );
  const counts = useMemo(() => getAgentCounts(visibleMessages), [visibleMessages]);

  const messagesByStage = useMemo(() => {
    const grouped = new Map<string, AgentMessageRead[]>();

    for (const message of visibleMessages) {
      const stageMessages = grouped.get(String(message.stage)) ?? [];
      stageMessages.push(message);
      grouped.set(String(message.stage), stageMessages);
    }

    return grouped;
  }, [visibleMessages]);

  return (
    <div className="space-y-4">
      <AgentFilter counts={counts} onChange={setRoleFilter} value={roleFilter} />

      {stageOrder.map((stage, index) => {
        const stageMessages = messagesByStage.get(String(stage)) ?? [];
        const filteredMessages = stageMessages.filter((message) =>
          matchesFilter(message, roleFilter),
        );
        const isComplete = stageMessages.length > 0;
        if (roleFilter !== "all" && filteredMessages.length === 0) {
          return null;
        }

        return (
          <section
            className="grid gap-3 rounded-md border border-slate-800 bg-slate-950/70 p-4 md:grid-cols-[11rem_minmax(0,1fr)]"
            key={String(stage)}
          >
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={[
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    isComplete
                      ? "border-violet-300 bg-violet-500 text-white"
                      : "border-slate-700 bg-slate-950 text-slate-500",
                  ].join(" ")}
                >
                  {index + 1}
                </span>
                <h3 className="text-sm font-semibold text-slate-100">
                  {STAGE_LABELS[stage]}
                </h3>
              </div>
            </div>

            <div className="min-w-0 space-y-3">
              {filteredMessages.length > 0 ? (
                filteredMessages.map((message) => (
                  <AgentMessageCard key={message.id} message={message} />
                ))
              ) : (
                <div className="rounded-md border border-dashed border-slate-700 bg-slate-900/70 px-3 py-4 text-sm leading-6 text-slate-400">
                  {isComplete
                    ? "当前筛选下没有该阶段发言。"
                    : "等待该阶段输出。"}
                </div>
              )}
            </div>
          </section>
        );
      })}

      {roleFilter !== "all" &&
      visibleMessages.length > 0 &&
      !visibleMessages.some((message) => matchesFilter(message, roleFilter)) ? (
        <div className="rounded-md border border-dashed border-slate-700 bg-slate-950 px-4 py-8 text-center text-sm leading-6 text-slate-400">
          当前筛选下没有发言。
        </div>
      ) : null}
    </div>
  );
}
