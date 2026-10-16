import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  gte,
  ilike,
  isNull,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/lib/db";
import { announcements, articles, mapLayers, projects } from "@/lib/db/schema";
import { requirePermission } from "@/lib/permissions";
import { getProjectScopeConditions, type ScopedUser } from "@/lib/scope";
import {
  announcementInputSchema,
  articleInputSchema,
  mapLayerInputSchema,
  type ContentKind,
  type ManagedList,
} from "@/lib/content-models";
import { publicStageCondition } from "@/lib/public-analytics/public-stage-condition";
import { projectYearScopeCondition } from "@/lib/abemis/year-scope";

type Actor = ScopedUser & { id: string };
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type ContentDatabase = Pick<
  typeof db,
  "select" | "insert" | "update" | "delete"
> & {
  transaction: <T>(callback: (tx: Transaction) => Promise<T>) => Promise<T>;
};
const tables = { articles, announcements, "map-layers": mapLayers };
const publicArticleColumns = {
  id: articles.id,
  title: articles.title,
  url: articles.url,
  source: articles.source,
  thumbnail: articles.thumbnail,
  thumbnailAlt: articles.thumbnailAlt,
  excerpt: articles.excerpt,
  category: articles.category,
  tags: articles.tags,
  author: articles.author,
  publishedDate: articles.publishedDate,
  projectId: articles.projectId,
  createdAt: articles.createdAt,
  updatedAt: articles.updatedAt,
};

export function requireContentPermission(
  user: Actor,
  kind: ContentKind,
  action: "list" | "create" | "update" | "delete",
) {
  if (kind === "articles") requirePermission(user.role, "articles", action);
  else {
    if (user.role !== "admin")
      throw Object.assign(new Error("Administrator access required"), {
        status: 403,
      });
    requirePermission(
      user.role,
      kind === "announcements" ? "announcements" : "system_settings",
      kind === "announcements" ? action : action === "list" ? "read" : "update",
    );
  }
}

function articleScope(user: Actor, database: ContentDatabase): SQL | undefined {
  return user.role === "moderator"
    ? exists(
        database
          .select({ id: projects.id })
          .from(projects)
          .where(
            and(
              eq(projects.abemisId, articles.projectId),
              ...getProjectScopeConditions(user),
            ),
          ),
      )
    : undefined;
}

export async function listManagedContent(
  user: Actor,
  kind: ContentKind,
  options: { search?: string; page?: number } = {},
  database: ContentDatabase = db,
): Promise<ManagedList> {
  requireContentPermission(user, kind, "list");
  const table = tables[kind];
  const page = Math.max(1, Math.min(100000, Math.trunc(options.page || 1)));
  const pageSize = 20;
  const search = options.search ? `%${options.search.slice(0, 200)}%` : null;
  const searchCondition = !search
    ? undefined
    : kind === "articles"
      ? or(
          ilike(articles.title, search),
          ilike(articles.source, search),
          ilike(articles.category, search),
          ilike(articles.projectId, search),
          exists(
            database
              .select({ id: projects.id })
              .from(projects)
              .where(
                and(
                  eq(projects.abemisId, articles.projectId),
                  ilike(projects.name, search),
                ),
              ),
          ),
        )
      : kind === "announcements"
        ? or(
            ilike(announcements.title, search),
            ilike(announcements.content, search),
          )
        : or(
            ilike(mapLayers.name, search),
            ilike(mapLayers.workspace, search),
            ilike(mapLayers.layerName, search),
          );
  const condition = and(
    searchCondition,
    kind === "articles" ? articleScope(user, database) : undefined,
  );
  const [data, [total]] = await Promise.all([
    database
      .select()
      .from(table)
      .where(condition)
      .orderBy(
        kind === "map-layers"
          ? asc(mapLayers.displayOrder)
          : desc(table.createdAt),
      )
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    database.select({ total: count() }).from(table).where(condition),
  ]);
  return { data, total: total.total, page, pageSize };
}

async function checkArticleAccess(
  user: Actor,
  projectId: string | null,
  database: ContentDatabase,
) {
  if (user.role === "moderator" && !projectId)
    throw Object.assign(
      new Error(
        "Moderators must link articles to a project in their assigned scope",
      ),
      { status: 403 },
    );
  if (!projectId) return;
  const [project] = await database
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(
        eq(projects.abemisId, projectId),
        ...(user.role === "moderator" ? getProjectScopeConditions(user) : []),
      ),
    )
    .limit(1);
  if (!project)
    throw Object.assign(
      new Error(
        user.role === "moderator"
          ? "Project code was not found in your assigned scope"
          : "Project code was not found",
      ),
      { status: user.role === "moderator" ? 403 : 400 },
    );
}

export async function saveManagedContent(
  user: Actor,
  kind: ContentKind,
  input: unknown,
  id?: string,
  database: ContentDatabase = db,
) {
  requireContentPermission(user, kind, id ? "update" : "create");
  if (id && !/^[a-f\d-]{36}$/i.test(id)) throw new Error("Invalid record ID");
  const table = tables[kind];
  const [existing] = id
    ? await database.select().from(table).where(eq(table.id, id)).limit(1)
    : [];
  if (id && !existing) throw new Error("Record not found");
  if (kind === "articles" && existing && "projectId" in existing)
    await checkArticleAccess(user, existing.projectId, database);
  let saved;
  if (kind === "articles") {
    const data = articleInputSchema.parse(input);
    await checkArticleAccess(user, data.projectId, database);
    [saved] = id
      ? await database
          .update(articles)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(articles.id, id))
          .returning()
      : await database
          .insert(articles)
          .values({ ...data, addedBy: user.id })
          .returning();
  } else if (kind === "announcements") {
    const data = announcementInputSchema.parse(input);
    saved = await database.transaction(async (tx) => {
      // Serialize activation so two administrators cannot leave two active notices.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(3101001)`);
      if (data.isActive)
        await tx
          .update(announcements)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(announcements.isActive, true));
      const [row] = id
        ? await tx
            .update(announcements)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(announcements.id, id))
            .returning()
        : await tx
            .insert(announcements)
            .values({ ...data, createdBy: user.id })
            .returning();
      return row;
    });
  } else {
    const data = mapLayerInputSchema.parse(input);
    [saved] = id
      ? await database
          .update(mapLayers)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(mapLayers.id, id))
          .returning()
      : await database
          .insert(mapLayers)
          .values({ ...data, createdBy: user.id })
          .returning();
  }
  return { saved, existing };
}

export async function deleteManagedContent(
  user: Actor,
  kind: ContentKind,
  id: string,
  database: ContentDatabase = db,
) {
  requireContentPermission(user, kind, "delete");
  const table = tables[kind];
  const [existing] = await database
    .select()
    .from(table)
    .where(eq(table.id, id))
    .limit(1);
  if (!existing) throw new Error("Record not found");
  if (kind === "articles" && "projectId" in existing)
    await checkArticleAccess(user, existing.projectId, database);
  await database.delete(table).where(eq(table.id, id));
  return existing;
}

export function publicArticleCondition(database: ContentDatabase = db) {
  return sql`(${articles.projectId} IS NULL OR ${exists(
    database
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.abemisId, articles.projectId),
          publicStageCondition(),
          projectYearScopeCondition(),
        ),
      ),
  )})`;
}

export async function getPublicArticles(
  options: {
    search?: string;
    category?: string;
    projectId?: string;
    page?: number;
  } = {},
  database: ContentDatabase = db,
) {
  const page = Math.max(1, Math.min(100000, Math.trunc(options.page || 1)));
  const pageSize = 12;
  const search = options.search ? `%${options.search.slice(0, 200)}%` : null;
  const condition = and(
    publicArticleCondition(database),
    search
      ? or(
          ilike(articles.title, search),
          ilike(articles.source, search),
          ilike(articles.excerpt, search),
        )
      : undefined,
    options.category ? eq(articles.category, options.category) : undefined,
    options.projectId ? eq(articles.projectId, options.projectId) : undefined,
  );
  const [data, [total]] = await Promise.all([
    database
      .select(publicArticleColumns)
      .from(articles)
      .where(condition)
      .orderBy(desc(articles.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    database.select({ total: count() }).from(articles).where(condition),
  ]);
  return { data, total: total.total, page, pageSize };
}

export async function getPublicProjectArticles(
  projectId: string,
  database: ContentDatabase = db,
) {
  return database
    .select(publicArticleColumns)
    .from(articles)
    .where(
      and(publicArticleCondition(database), eq(articles.projectId, projectId)),
    )
    .orderBy(desc(articles.createdAt));
}

export async function getActiveAnnouncement(
  now = new Date(),
  database: ContentDatabase = db,
) {
  const [row] = await database
    .select()
    .from(announcements)
    .where(
      and(
        eq(announcements.isActive, true),
        or(isNull(announcements.startDate), lte(announcements.startDate, now)),
        or(isNull(announcements.endDate), gte(announcements.endDate, now)),
      ),
    )
    .orderBy(desc(announcements.createdAt))
    .limit(1);
  return row ?? null;
}

export async function getActiveMapLayers(database: ContentDatabase = db) {
  return database
    .select({
      id: mapLayers.id,
      name: mapLayers.name,
      description: mapLayers.description,
      geoserverUrl: mapLayers.geoserverUrl,
      workspace: mapLayers.workspace,
      layerName: mapLayers.layerName,
      styleName: mapLayers.styleName,
      opacity: mapLayers.opacity,
      legendShape: mapLayers.legendShape,
      legendColor: mapLayers.legendColor,
      displayOrder: mapLayers.displayOrder,
    })
    .from(mapLayers)
    .where(eq(mapLayers.isActive, true))
    .orderBy(asc(mapLayers.displayOrder), asc(mapLayers.name));
}
