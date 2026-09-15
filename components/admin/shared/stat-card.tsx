import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  iconColor?: string;
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, iconColor }: StatCardProps) {
  const getIconColorClasses = () => {
    if (iconColor) return iconColor;

    if (title.includes("Projects")) {
      return "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400";
    }
    if (title.includes("Submissions")) {
      return "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400";
    }
    if (title.includes("Pending")) {
      return "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400";
    }
    if (title.includes("Users")) {
      return "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400";
    }
    return "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400";
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2.5 rounded-lg ${getIconColorClasses()}`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</span>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
            {value}
          </div>
          {subtitle && (
            <div className="text-sm text-slate-600 dark:text-slate-400">{subtitle}</div>
          )}
        </div>
        {trend && (
          <div
            className={`px-2 py-1 rounded-lg text-xs font-medium ${
              trend.isPositive
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
            }`}
          >
            {trend.isPositive ? "↑" : "↓"} {trend.value}
          </div>
        )}
      </div>
    </div>
  );
}
