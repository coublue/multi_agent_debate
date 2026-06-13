"use client";

export type DebateViewMode = "overview" | "process" | "report";

type DebateViewTabsProps = {
  value: DebateViewMode;
  onChange: (value: DebateViewMode) => void;
};

const TABS: { label: string; value: DebateViewMode }[] = [
  { label: "总览", value: "overview" },
  { label: "完整过程", value: "process" },
  { label: "裁判报告", value: "report" },
];

export function DebateViewTabs({ value, onChange }: DebateViewTabsProps) {
  return (
    <div className="mb-5 flex flex-wrap gap-2 rounded-md border border-slate-800 bg-slate-950 p-1 shadow-sm shadow-black/20">
      {TABS.map((tab) => {
        const active = tab.value === value;

        return (
          <button
            aria-pressed={active}
            className={[
              "min-h-9 rounded px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 focus:ring-offset-slate-950",
              active
                ? "bg-violet-500 text-white shadow-sm shadow-violet-950/30"
                : "text-slate-400 hover:bg-slate-900 hover:text-slate-100",
            ].join(" ")}
            key={tab.value}
            onClick={() => onChange(tab.value)}
            type="button"
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
