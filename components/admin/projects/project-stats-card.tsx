import { CheckCircle2, Clock3, Database, PauseCircle, WalletCards } from "lucide-react";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function ProjectStatsCard({
  statistics,
}: {
  statistics: {
    total: number;
    totalBudget: number;
    ongoing: number;
    completed: number;
    planned: number;
    suspended: number;
  };
}) {
  const items = [
    { label: "Projects", value: statistics.total.toLocaleString(), icon: Database },
    { label: "Budget", value: formatCurrency(statistics.totalBudget), icon: WalletCards },
    { label: "Ongoing", value: statistics.ongoing.toLocaleString(), icon: Clock3 },
    { label: "Completed", value: statistics.completed.toLocaleString(), icon: CheckCircle2 },
    { label: "Suspended", value: statistics.suspended.toLocaleString(), icon: PauseCircle },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <Icon className="size-4 text-primary" />
              {item.label}
            </div>
            <p className="mt-3 truncate text-xl font-extrabold text-slate-950 dark:text-white">{item.value}</p>
          </div>
        );
      })}
    </section>
  );
}
