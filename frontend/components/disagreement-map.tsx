import type { AgentMessageRead } from "@/lib/types";

type DisagreementMapProps = {
  messages: AgentMessageRead[];
};

type DisagreementItem = {
  con_position: string;
  issue: string;
  pro_position: string;
};

export function DisagreementMap({ messages }: DisagreementMapProps) {
  const items = getDisagreementItems(messages);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-950">争议点矩阵</h2>
        <p className="mt-1 text-sm text-slate-500">
          来自主持人输出的结构化分歧整理。
        </p>
      </div>

      {items.length > 0 ? (
        <div className="overflow-hidden rounded-md border border-slate-200">
          <div className="hidden grid-cols-[1fr_1fr_1fr] bg-slate-50 text-xs font-semibold text-slate-500 md:grid">
            <div className="border-r border-slate-200 px-3 py-2">争议点</div>
            <div className="border-r border-slate-200 px-3 py-2">正方立场</div>
            <div className="px-3 py-2">反方立场</div>
          </div>
          <div className="divide-y divide-slate-200">
            {items.map((item, index) => (
              <article
                className="grid gap-0 md:grid-cols-[1fr_1fr_1fr]"
                key={`${item.issue}-${index}`}
              >
                <MatrixCell label="争议点" value={item.issue} />
                <MatrixCell label="正方立场" tone="pro" value={item.pro_position} />
                <MatrixCell label="反方立场" tone="con" value={item.con_position} />
              </article>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          暂无结构化摘要。新版本主持人输出包含 disagreement_map 后会在这里展示。
        </div>
      )}
    </section>
  );
}

function MatrixCell({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: "pro" | "con";
  value: string;
}) {
  const toneClass =
    tone === "pro"
      ? "bg-emerald-50/70 text-emerald-950"
      : tone === "con"
        ? "bg-amber-50/70 text-amber-950"
        : "bg-white text-slate-900";

  return (
    <div
      className={`min-w-0 border-b border-slate-100 px-3 py-3 md:border-b-0 md:border-r md:border-slate-200 md:last:border-r-0 ${toneClass}`}
    >
      <div className="mb-1 text-xs font-semibold text-slate-500 md:hidden">
        {label}
      </div>
      <p className="break-words text-sm leading-6">{value}</p>
    </div>
  );
}

function getDisagreementItems(messages: AgentMessageRead[]) {
  const items: DisagreementItem[] = [];

  for (const message of messages) {
    if (String(message.agent_role) !== "moderator") {
      continue;
    }

    const value = message.content.disagreement_map;
    if (!Array.isArray(value)) {
      continue;
    }

    for (const item of value) {
      if (!isRecord(item)) {
        continue;
      }

      const issue = getText(item.issue);
      const proPosition = getText(item.pro_position);
      const conPosition = getText(item.con_position);

      if (issue || proPosition || conPosition) {
        items.push({
          issue: issue || "未命名争议点",
          pro_position: proPosition || "暂无正方立场",
          con_position: conPosition || "暂无反方立场",
        });
      }
    }
  }

  return items;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}
