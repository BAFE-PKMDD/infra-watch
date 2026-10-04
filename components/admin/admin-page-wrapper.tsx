import type React from "react";
import { TourLauncher } from "@/components/admin/tour/tour-launcher";

type AdminPageWrapperProps = {
  title: string;
  description: string;
  breadcrumbs?: Array<{ label: string }>;
  children: React.ReactNode;
};

export function AdminPageWrapper({ title, description, breadcrumbs = [], children }: AdminPageWrapperProps) {
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
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
        <div data-tour="page-heading" className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl dark:text-white">{title}</h1>
            <p className="mt-1.5 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">{description}</p>
          </div>
          <TourLauncher />
        </div>
      </div>
      <div data-tour="page-content" className="animate-in fade-in slide-in-from-bottom-1 duration-500 motion-reduce:animate-none">{children}</div>
    </div>
  );
}
