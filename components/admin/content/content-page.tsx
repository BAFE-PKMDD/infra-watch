import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { listManagedContent } from "@/lib/content-management";
import type { ContentKind } from "@/lib/content-models";
import { hasPermission } from "@/lib/permissions";
import { requireAuth } from "@/lib/session";
import { CONTENT_CONFIG } from "./content-form-config";
import { ContentManager } from "./content-manager";

export async function ContentPage({ kind }: { kind: ContentKind }) {
  const user = await requireAuth();
  const initial = await listManagedContent(user, kind);
  const permission = (action: "create" | "update" | "delete") =>
    kind === "articles"
      ? hasPermission(user.role, "articles", action)
      : user.role === "admin";
  const config = CONTENT_CONFIG[kind];
  return (
    <AdminPageWrapper
      title={config.title}
      description={config.description}
      breadcrumbs={[{ label: "Admin" }, { label: config.title }]}
    >
      <ContentManager
        kind={kind}
        initial={initial}
        userId={user.id}
        moderator={user.role === "moderator"}
        permissions={{
          create: permission("create"),
          update: permission("update"),
          delete: permission("delete"),
        }}
      />
    </AdminPageWrapper>
  );
}
