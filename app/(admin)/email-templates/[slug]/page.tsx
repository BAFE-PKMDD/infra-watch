import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { EmailTemplateEditor } from "@/components/admin/email-templates/email-template-editor";
import { getTemplateBySlug } from "@/lib/email-template-registry";
import { getEmailTemplateContent } from "@/lib/email-templates";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Edit Email Template | INFRA Watch" };
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireAdmin();
  const { slug } = await params;
  if (!getTemplateBySlug(slug)) notFound();
  const template = await getEmailTemplateContent(slug);
  return (
    <AdminPageWrapper
      title={template.name}
      description={template.description}
      breadcrumbs={[{ label: "Admin" }, { label: "Email Templates" }]}
    >
      <Link
        href="/email-templates"
        className="mb-4 inline-flex min-h-11 items-center text-sm font-semibold text-primary underline dark:text-indigo-300"
      >
        Back to Email Templates
      </Link>
      <EmailTemplateEditor
        key={`${template.slug}:${template.updatedAt?.toISOString() || "default"}`}
        template={template}
      />
    </AdminPageWrapper>
  );
}
