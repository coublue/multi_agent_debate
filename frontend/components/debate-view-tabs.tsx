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
    <div className="mb-5 flex flex-wrap gap-2 rounded-md border border-slate-200 bg-white p-1 shadow-sm">
      {TABS.map((tab) => {
        const active = tab.value === value;

        return (
          <button
            aria-pressed={active}
            className={[
              "min-h-9 rounded px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
              active
                ? "bg-slate-950 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
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
