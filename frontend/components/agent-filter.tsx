"use client";

export type AgentRoleFilter = "all" | "moderator" | "pro" | "con" | "judge";

type AgentFilterProps = {
  value: AgentRoleFilter;
  onChange: (value: AgentRoleFilter) => void;
  counts?: Partial<Record<AgentRoleFilter, number>>;
};

const FILTER_OPTIONS: Array<{
  value: AgentRoleFilter;
  label: string;
}> = [
  { value: "all", label: "全部" },
  { value: "moderator", label: "主持人" },
  { value: "pro", label: "正方" },
  { value: "con", label: "反方" },
  { value: "judge", label: "裁判" },
];

export function AgentFilter({ value, onChange, counts }: AgentFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-slate-300">筛选发言</span>
      <div
        aria-label="Agent 发言筛选"
        className="flex flex-wrap gap-1 rounded-md border border-slate-800 bg-slate-950 p-1"
        role="group"
      >
        {FILTER_OPTIONS.map((option) => {
          const active = value === option.value;
          const count = counts?.[option.value];

          return (
            <button
              aria-pressed={active}
              className={[
                "min-h-8 rounded px-3 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 focus:ring-offset-slate-950",
                active
                  ? "bg-violet-500 text-white shadow-sm shadow-violet-950/30"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-100",
              ].join(" ")}
              key={option.value}
              onClick={() => onChange(option.value)}
              type="button"
            >
              {option.label}
              {typeof count === "number" ? (
                <span className={active ? "text-white/75" : "text-slate-500"}>
                  {" "}
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
