import { Suspense } from "react";

import ProjectsDirectoryClient from "./projects-directory-client";

export default function ProjectsPage() {
  return (
    <Suspense
      fallback={(
        <main className="min-h-screen bg-slate-50 px-4 py-20 dark:bg-slate-950">
          <div className="mx-auto max-w-7xl rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            Loading the project directory…
          </div>
        </main>
      )}
    >
      <ProjectsDirectoryClient />
    </Suspense>
  );
}
