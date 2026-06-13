import type { JudgeReport as JudgeReportValue } from "@/lib/types";

type JudgeReportProps = {
  report: JudgeReportValue | null | undefined;
};

function formatWinner(winner: string) {
  if (winner === "mixed") {
    return "综合结论";
  }

  if (winner === "balanced") {
    return "均衡结论";
  }

  if (winner === "pro") {
    return "正方";
  }

  if (winner === "con") {
    return "反方";
  }

  return winner;
}

function SectionList({
  items,
  title,
}: {
  items?: string[] | null;
  title: string;
}) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-slate-100">{title}</h3>
      {items && items.length > 0 ? (
        <ul className="list-disc space-y-1 break-words pl-5 text-sm leading-6 text-slate-300">
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">暂无内容。</p>
      )}
    </section>
  );
}

export function JudgeReport({ report }: JudgeReportProps) {
  if (!report) {
    return (
      <div className="rounded-md border border-dashed border-slate-700 bg-slate-900/70 px-4 py-8 text-center text-sm text-slate-400">
        裁判报告尚未生成，辩论完成后会显示最终判断。
      </div>
    );
  }

  return (
    <article className="rounded-md border border-slate-800 bg-slate-950 p-5">
      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-md border border-slate-800 bg-slate-900/80 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            结论方
          </div>
          <div className="mt-1 text-lg font-semibold text-slate-50">
            {formatWinner(report.winner)}
          </div>
        </div>
        <div className="rounded-md border border-slate-800 bg-slate-900/80 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            可信度
          </div>
          <div className="mt-1 text-lg font-semibold text-violet-100">
            {report.credibility_score}/100
          </div>
        </div>
        <div className="rounded-md border border-slate-800 bg-slate-900/80 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            核心主张
          </div>
          <div className="mt-1 max-h-16 overflow-hidden break-words text-sm font-medium leading-5 text-slate-100">
            {report.main_claim}
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <SectionList
          items={report.pro_strongest_points}
          title="正方最强论点"
        />
        <SectionList
          items={report.con_strongest_points}
          title="反方最强论点"
        />
        <SectionList items={report.credible_parts} title="可信部分" />
        <SectionList
          items={report.questionable_parts}
          title="存疑部分"
        />
        <SectionList
          items={report.key_disagreements}
          title="关键分歧"
        />
        <SectionList
          items={report.decision_basis}
          title="判定依据"
        />
      </div>

      <section className="mt-5 border-t border-slate-800 pt-5">
        <h3 className="mb-2 text-sm font-semibold text-slate-100">
          最终总结
        </h3>
        <p className="break-words text-sm leading-6 text-slate-300">
          {report.final_summary}
        </p>
      </section>
    </article>
  );
}
