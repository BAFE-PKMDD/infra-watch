import Link from "next/link";
import type { ReactNode } from "react";

export function PublicInformationPage({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="bg-slate-50 py-12 sm:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-200 bg-slate-950 px-6 py-10 text-white sm:px-10">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">{eyebrow}</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">{description}</p>
          </header>
          <div className="prose prose-slate max-w-none px-6 py-8 prose-headings:font-black prose-a:text-blue-700 sm:px-10 sm:py-10">
            {children}
          </div>
          <footer className="flex flex-wrap gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5 sm:px-10">
            <Link href="/" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-100">
              Return home
            </Link>
            <Link href="/contact" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">
              Contact InfraWatch
            </Link>
          </footer>
        </div>
      </div>
    </main>
  );
}
