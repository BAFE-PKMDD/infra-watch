import Link from "next/link";
import { getManagedEmailTemplates } from "@/actions/mutation/email-templates.mutation";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";

export const metadata = { title: "Email Templates | INFRA Watch" };
export default async function Page() {
  const templates = await getManagedEmailTemplates();
  return (
    <AdminPageWrapper
      title="Email Templates"
      description="Edit authentication and contact email subjects, body text, and placeholders. Changes apply to future emails."
      breadcrumbs={[{ label: "Admin" }, { label: "Email Templates" }]}
    >
      <div className="divide-y divide-slate-300 rounded-lg border border-slate-300 bg-background dark:divide-slate-700 dark:border-slate-700">
        {templates.map((template) => (
          <div
            key={template.slug}
            className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h2 className="text-lg font-semibold">{template.name}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {template.description}
              </p>
              <p className="mt-2 text-sm">
                {template.isActive ? "Enabled" : "Disabled"} ·{" "}
                {template.updatedAt ? "Customized" : "Default content"}
              </p>
            </div>
            <Link
              href={`/email-templates/${template.slug}`}
              className="inline-flex min-h-11 shrink-0 items-center rounded-md border border-slate-500 px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-primary dark:border-slate-400"
            >
              Edit template
            </Link>
          </div>
        ))}
      </div>
    </AdminPageWrapper>
  );
}
