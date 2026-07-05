import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceProjectId: text("source_project_id").notNull().unique(),
    projectCode: text("project_code"),
    name: text("name").notNull(),
    description: text("description"),
    program: text("program").notNull().default("AMEFIP"),
    subProgram: text("sub_program"),
    projectType: text("project_type").notNull(),
    status: text("status").notNull(),
    stage: text("stage"),
    region: text("region"),
    province: text("province"),
    municipality: text("municipality"),
    barangay: text("barangay"),
    latitude: real("latitude"),
    longitude: real("longitude"),
    budget: numeric("budget", { precision: 14, scale: 2 }),
    contractAmount: numeric("contract_amount", { precision: 14, scale: 2 }),
    physicalProgress: integer("physical_progress").notNull().default(0),
    financialProgress: integer("financial_progress").notNull().default(0),
    implementingAgency: text("implementing_agency"),
    contractorName: text("contractor_name"),
    yearFunded: text("year_funded"),
    startDate: timestamp("start_date", { mode: "date" }),
    targetCompletionDate: timestamp("target_completion_date", { mode: "date" }),
    actualCompletionDate: timestamp("actual_completion_date", { mode: "date" }),
    metadata: jsonb("metadata"),
    lastSyncedAt: timestamp("last_synced_at", { mode: "date" }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    sourceProjectIdIdx: index("projects_source_project_id_idx").on(table.sourceProjectId),
    statusIdx: index("projects_status_idx").on(table.status),
    regionIdx: index("projects_region_idx").on(table.region),
    provinceIdx: index("projects_province_idx").on(table.province),
    yearFundedIdx: index("projects_year_funded_idx").on(table.yearFunded),
  }),
);

export const feedback = pgTable(
  "feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.sourceProjectId, { onDelete: "cascade" }),
    userId: text("user_id"),
    rating: integer("rating"),
    comment: text("comment"),
    category: text("category"),
    media: jsonb("media").$type<Array<{ type: "image" | "video"; url: string; caption?: string }>>().default([]),
    isAnonymous: boolean("is_anonymous").notNull().default(false),
    helpfulCount: integer("helpful_count").notNull().default(0),
    status: text("status").notNull().default("pending"),
    moderatedBy: text("moderated_by"),
    moderatedAt: timestamp("moderated_at", { mode: "date" }),
    moderationNote: text("moderation_note"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    projectIdIdx: index("feedback_project_id_idx").on(table.projectId),
    statusIdx: index("feedback_status_idx").on(table.status),
  }),
);

export const issues = pgTable(
  "issues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketNumber: text("ticket_number").notNull().unique(),
    projectId: text("project_id").references(() => projects.sourceProjectId, { onDelete: "set null" }),
    reporterUserId: text("reporter_user_id"),
    reporterName: text("reporter_name"),
    reporterContact: text("reporter_contact"),
    reporterEmail: text("reporter_email"),
    isAnonymous: boolean("is_anonymous").notNull().default(false),
    category: text("category").notNull(),
    status: text("status").notNull().default("submitted"),
    priority: text("priority").notNull().default("normal"),
    description: text("description").notNull(),
    region: text("region"),
    province: text("province"),
    municipality: text("municipality"),
    barangay: text("barangay"),
    landmark: text("landmark"),
    latitude: real("latitude"),
    longitude: real("longitude"),
    evidence: jsonb("evidence").$type<Array<{ type: "image" | "document"; url: string; name?: string }>>().default([]),
    assignedTo: text("assigned_to"),
    resolvedAt: timestamp("resolved_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    ticketNumberIdx: index("issues_ticket_number_idx").on(table.ticketNumber),
    projectIdIdx: index("issues_project_id_idx").on(table.projectId),
    statusIdx: index("issues_status_idx").on(table.status),
  }),
);

export const syncLogs = pgTable("sync_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  syncType: text("sync_type").notNull(),
  resource: text("resource").notNull().default("project"),
  status: text("status").notNull(),
  recordsAdded: integer("records_added").notNull().default(0),
  recordsUpdated: integer("records_updated").notNull().default(0),
  recordsFailed: integer("records_failed").notNull().default(0),
  totalProcessed: integer("total_processed").notNull().default(0),
  errors: jsonb("errors").$type<string[]>().default([]),
  errorDetails: text("error_details"),
  startedAt: timestamp("started_at", { mode: "date" }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { mode: "date" }),
  duration: integer("duration"),
  triggeredBy: text("triggered_by"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});
export const checklistPhases = pgTable(
  "checklist_phases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    gateLabel: text("gate_label"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    codeIdx: uniqueIndex("checklist_phases_code_idx").on(table.code),
    sortOrderIdx: index("checklist_phases_sort_order_idx").on(table.sortOrder),
  }),
);

export const checklistTemplates = pgTable(
  "checklist_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    projectType: text("project_type").notNull().default("infrastructure"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    codeIdx: uniqueIndex("checklist_templates_code_idx").on(table.code),
    projectTypeIdx: index("checklist_templates_project_type_idx").on(table.projectType),
  }),
);

export const checklistTemplateItems = pgTable(
  "checklist_template_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => checklistTemplates.id, { onDelete: "cascade" }),
    phaseId: uuid("phase_id")
      .notNull()
      .references(() => checklistPhases.id, { onDelete: "restrict" }),
    code: text("code").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    evidenceRequired: boolean("evidence_required").notNull().default(false),
    requiredRole: text("required_role").notNull().default("moderator"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    codeIdx: uniqueIndex("checklist_template_items_template_code_idx").on(table.templateId, table.code),
    templateIdx: index("checklist_template_items_template_idx").on(table.templateId),
    phaseIdx: index("checklist_template_items_phase_idx").on(table.phaseId),
  }),
);

export const projectChecklists = pgTable(
  "project_checklists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectCode: text("project_code").notNull(),
    projectName: text("project_name").notNull(),
    projectLocation: text("project_location"),
    templateId: uuid("template_id")
      .notNull()
      .references(() => checklistTemplates.id, { onDelete: "restrict" }),
    ownerUserId: text("owner_user_id"),
    status: text("status").notNull().default("in_progress"),
    currentPhaseId: uuid("current_phase_id").references(() => checklistPhases.id, { onDelete: "set null" }),
    dueDate: timestamp("due_date", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    projectCodeIdx: uniqueIndex("project_checklists_project_code_idx").on(table.projectCode),
    templateIdx: index("project_checklists_template_idx").on(table.templateId),
    statusIdx: index("project_checklists_status_idx").on(table.status),
    currentPhaseIdx: index("project_checklists_current_phase_idx").on(table.currentPhaseId),
  }),
);

export const projectChecklistItems = pgTable(
  "project_checklist_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    checklistId: uuid("checklist_id")
      .notNull()
      .references(() => projectChecklists.id, { onDelete: "cascade" }),
    templateItemId: uuid("template_item_id")
      .notNull()
      .references(() => checklistTemplateItems.id, { onDelete: "restrict" }),
    phaseId: uuid("phase_id")
      .notNull()
      .references(() => checklistPhases.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("pending"),
    remarks: text("remarks"),
    evidence: jsonb("evidence").$type<Array<{ type: "image" | "document" | "link"; url: string; name?: string }>>().default([]),
    completedBy: text("completed_by"),
    completedAt: timestamp("completed_at", { mode: "date" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    checklistItemIdx: uniqueIndex("project_checklist_items_checklist_template_item_idx").on(table.checklistId, table.templateItemId),
    checklistIdx: index("project_checklist_items_checklist_idx").on(table.checklistId),
    phaseIdx: index("project_checklist_items_phase_idx").on(table.phaseId),
    statusIdx: index("project_checklist_items_status_idx").on(table.status),
  }),
);
