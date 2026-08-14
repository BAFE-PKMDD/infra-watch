"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUpRight } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartSpec, parseChartSpec } from "@/lib/chat-visuals";
import { getProjectHref, isProjectHref } from "@/lib/chat-links";

type MarkdownNode = {
  type: string;
  value?: string;
  url?: string;
  children?: MarkdownNode[];
};

function remarkProjectCodeLinks() {
  return (tree: MarkdownNode) => {
    function visit(node: MarkdownNode) {
      if (!node.children) return;
      node.children = node.children.map((child) => {
        if (child.type === "inlineCode" && node.type !== "link") {
          const href = getProjectHref(child.value ?? "");
          if (href) return { type: "link", url: href, children: [child] };
        }
        visit(child);
        return child;
      });
    }
    visit(tree);
  };
}

const CHART_COLORS = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#ea580c",
  "#4f46e5",
  "#65a30d",
  "#db2777",
  "#0f766e",
  "#9333ea",
];

function formatChartValue(value: number, chart: ChartSpec) {
  return `${chart.valuePrefix ?? ""}${new Intl.NumberFormat("en-PH", {
    notation: Math.abs(value) >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value)}${chart.valueSuffix ?? ""}`;
}

function ChartCard({ chart }: { chart: ChartSpec }) {
  const chartHeight = Math.max(220, Math.min(360, chart.data.length * 34));
  const accessibleSummary = `${chart.title}. ${chart.data
    .map((item) => `${item.label}: ${formatChartValue(item.value, chart)}`)
    .join("; ")}`;
  const tooltipFormatter = (
    value: number | string | readonly (number | string)[] | undefined,
  ): [string, string] => {
    const numericValue =
      typeof value === "number" || typeof value === "string" ? value : value?.[0];

    return [
      formatChartValue(Number(numericValue ?? 0), chart),
      chart.valueLabel ?? "Value",
    ];
  };

  return (
    <figure className="my-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <figcaption className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
        {chart.title}
      </figcaption>

      {chart.type === "bar" ? (
        <div
          style={{ height: chartHeight }}
          className="w-full"
          role="img"
          aria-label={accessibleSummary}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chart.data}
              layout="vertical"
              margin={{ top: 4, right: 12, bottom: 4, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: "#64748b" }}
                tickFormatter={(value) => formatChartValue(Number(value), chart)}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={88}
                tick={{ fontSize: 10, fill: "#475569" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={tooltipFormatter}
                contentStyle={{
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="value" fill="#2563eb" radius={[0, 5, 5, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <>
          <div
            className="h-56 w-full"
            role="img"
            aria-label={accessibleSummary}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chart.data}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={48}
                  outerRadius={78}
                  paddingAngle={2}
                >
                  {chart.data.map((item, index) => (
                    <Cell
                      key={`${item.label}-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={tooltipFormatter} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
            {chart.data.map((item, index) => (
              <div key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                />
                <span className="truncate" title={item.label}>
                  {item.label}: {formatChartValue(item.value, chart)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </figure>
  );
}

function PendingChart() {
  return (
    <div
      className="my-3 space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900"
      aria-hidden="true"
    >
      <div className="h-4 w-32 animate-pulse rounded bg-slate-200 motion-reduce:animate-none dark:bg-slate-700" />
      <div className="flex h-40 items-end gap-2">
        {[45, 72, 56, 88, 64].map((height) => (
          <div
            key={height}
            className="flex-1 animate-pulse rounded-t bg-blue-100 motion-reduce:animate-none dark:bg-blue-950"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">Preparing chart…</p>
    </div>
  );
}

export function AiMessageContent({
  content,
  isStreaming = false,
}: {
  content: string;
  isStreaming?: boolean;
}) {
  return (
    <div className="min-w-0 text-[13px] leading-5 text-slate-800 dark:text-slate-100">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkProjectCodeLinks]}
        components={{
          h1: ({ children }) => (
            <h3 className="mb-2 mt-4 text-base font-semibold tracking-tight first:mt-0">
              {children}
            </h3>
          ),
          h2: ({ children }) => (
            <h3 className="mb-2 mt-4 text-[15px] font-semibold tracking-tight first:mt-0">
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h4 className="mb-1.5 mt-3 font-semibold text-slate-900 first:mt-0 dark:text-white">
              {children}
            </h4>
          ),
          p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="my-2 space-y-1 pl-4 marker:text-blue-500">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 list-decimal space-y-3 pl-5 marker:font-semibold marker:text-slate-500">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-0.5">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-950 dark:text-white">{children}</strong>
          ),
          hr: () => <hr className="my-3 border-slate-200 dark:border-slate-700" />,
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-blue-500 pl-3 text-slate-600 dark:text-slate-300">
              {children}
            </blockquote>
          ),
          a: ({ children, href }) =>
            isProjectHref(href) ? (
              <Link
                href={href}
                className="font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900 dark:text-blue-300"
                title="Open project overview"
              >
                {children}
                <ArrowUpRight className="ml-0.5 inline h-3 w-3" aria-hidden="true" />
              </Link>
            ) : (
              <span
                className="font-medium text-slate-700 underline decoration-slate-300 underline-offset-2 dark:text-slate-300"
                title="External link omitted"
              >
                {children}
              </span>
            ),
          table: ({ children }) => (
            <div
              className="my-3 max-w-full overflow-x-auto rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:border-slate-700"
              role="region"
              aria-label="Scrollable project results table"
              tabIndex={0}
            >
              <p className="sticky left-0 border-b border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] text-slate-500 sm:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                Swipe horizontally to view all columns.
              </p>
              <table className="w-full min-w-[680px] border-collapse text-left text-xs">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="min-w-28 whitespace-nowrap px-2.5 py-2 font-semibold first:min-w-52 last:min-w-44">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="min-w-28 border-t border-slate-200 px-2.5 py-2 align-top break-words first:min-w-52 last:min-w-44 dark:border-slate-700">
              {children}
            </td>
          ),
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children }) => {
            const source = String(children).replace(/\n$/, "");
            if (className === "language-chart") {
              const chart = parseChartSpec(source);
              if (chart) return <ChartCard chart={chart} />;
              if (isStreaming) return <PendingChart />;
            }

            if (className) {
              return (
                <pre className="my-3 max-w-full overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs leading-5 text-slate-100">
                  <code>{source}</code>
                </pre>
              );
            }

            return (
              <code className="break-all rounded bg-slate-200 px-1 py-0.5 font-mono text-[11px] text-slate-800 dark:bg-slate-700 dark:text-slate-100">
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
