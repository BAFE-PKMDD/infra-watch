import type React from "react";

type AdminPageWrapperProps = {
  title: string;
  description: string;
  breadcrumbs?: Array<{ label: string }>;
  children: React.ReactNode;
};

export function AdminPageWrapper({ title, description, breadcrumbs = [], children }: AdminPageWrapperProps) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-3">
        {breadcrumbs.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {breadcrumbs.map((item, index) => (
              <span key={`${item.label}-${index}`} className="flex items-center gap-2">
                {index > 0 && <span className="text-slate-300 dark:text-slate-700">/</span>}
                {item.label}
              </span>
            ))}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-3xl">{title}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
