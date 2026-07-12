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
  uuid,
  customType,
} from "drizzle-orm/pg-core";

// PostGIS geometry type for spatial data
const geometry = customType<{ data: string | null; driverData: string | null }>({
  dataType() {
    return "geometry(Point, 4326)";
  },
  toDriver(value: string | null): string | null {
    return value;
  },
  fromDriver(value: string | null): string | null {
    return value;
  },
});

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    abemisRawId: text("abemis_raw_id").unique(),
    abemisId: text("abemis_id").notNull().unique(),
    projectCode: text("project_code"),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status").notNull(),
    province: text("province"),
    municipality: text("municipality"),
    barangay: text("barangay"),
    latitude: real("latitude"),
    longitude: real("longitude"),
    budget: numeric("budget", { precision: 14, scale: 2 }),
    abc: real("abc"),
    contractAmount: numeric("contract_amount", { precision: 14, scale: 2 }),
    calendarDays: integer("calendar_days"),
    physicalProgress: integer("physical_progress").notNull().default(0),
    financialProgress: integer("financial_progress").notNull().default(0),
    implementingAgency: text("implementing_agency"),
    contractorName: text("contractor_name"),
    startDate: timestamp("start_date", { mode: "date" }),
    targetCompletionDate: timestamp("target_completion_date", { mode: "date" }),
    actualCompletionDate: timestamp("actual_completion_date", { mode: "date" }),
    operatingUnit: text("operating_unit"),
    bannerProgram: text("banner_program"),
    yearFunded: text("year_funded"),
    projectType: text("project_type").notNull(),
    region: text("region"),
    district: text("district"),
    stage: text("stage"),
    program: text("program").notNull().default("AMEFIP"),
    author: text("author"),
    quantity: text("quantity"),
    quantityUnit: text("quantity_unit"),
    beneficiary: text("beneficiary"),
    prexcProgram: text("prexc_program"),
    subProgram: text("sub_program"),
    indicatorLevel1: text("indicator_level1"),
    indicatorLevel3: text("indicator_level3"),
    recipientType: text("recipient_type"),
    budgetProcess: text("budget_process"),
    dateTurnOver: text("date_turn_over"),
    roadClass: text("road_class"),
    roadType: text("road_type"),
    roadUsed: text("road_used"),
    implementationType: text("implementation_type"),
    proposedLength: text("proposed_length"),
    postGeotaggedLength: text("post_geotagged_length"),
    procurementMode: text("procurement_mode"),
    psgcCode: text("psgc_code"),
    metadata: jsonb("metadata"),
    commodities: jsonb("commodities").$type<string[]>().default([]),
    geom: geometry("geom"),
    lastSyncedAt: timestamp("last_synced_at", { mode: "date" }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    abemisIdIdx: index("projects_abemis_id_idx").on(table.abemisId),
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
      .references(() => projects.abemisId, { onDelete: "cascade" }),
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
    projectId: text("project_id").references(() => projects.abemisId, { onDelete: "set null" }),
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
    evidence: jsonb("evidence").$type<Array<{ type: "image" | "video" | "document"; url: string; name?: string }>>().default([]),
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

export const issueResponses = pgTable(
  "issue_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    issueId: uuid("issue_id")
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),
    responderId: text("responder_id").notNull(),
    responderName: text("responder_name").notNull(),
    responderRole: text("responder_role"),
    message: text("message").notNull(),
    statusChange: text("status_change"),
    newStatus: text("new_status"),
    internalNotes: text("internal_notes"),
    isInternalOnly: boolean("is_internal_only").notNull().default(false),
    attachmentUrls: jsonb("attachment_urls").$type<string[]>().default([]),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    issueIdIdx: index("issue_responses_issue_id_idx").on(table.issueId),
    responderIdIdx: index("issue_responses_responder_id_idx").on(table.responderId),
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

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tableName: text("table_name").notNull(),
    recordId: text("record_id").notNull(),
    action: text("action").notNull(),
    userId: text("user_id"),
    userName: text("user_name"),
    oldValues: jsonb("old_values").$type<Record<string, unknown> | null>(),
    newValues: jsonb("new_values").$type<Record<string, unknown> | null>(),
    changedFields: jsonb("changed_fields").$type<string[] | null>(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
    tableNameIdx: index("audit_logs_table_name_idx").on(table.tableName),
    actionIdx: index("audit_logs_action_idx").on(table.action),
    userIdIdx: index("audit_logs_user_id_idx").on(table.userId),
  }),
);


export const psgcLocations = pgTable("psgc_locations", {
  id: uuid("id").primaryKey().defaultRandom(),

  // PSGC Identifiers
  geoCode: text("geo_code").notNull().unique(), // The 10-digit code (geo_code)
  geoCode1: text("geo_code1"), // The 9-digit code (geo_code1)

  // Names
  regionName: text("region_name").notNull(),
  regionShortname: text("reg_shortname"),
  provinceName: text("province_name"),
  municipalityName: text("municipality_name"),
  barangayName: text("barangay_name"),

  // Specific Codes
  regionCode: text("region_code"),
  provinceCode: text("province_code"),
  municipalityCode: text("municipality_code"),
  barangayCode: text("barangay_code"),

  // phcodes
  phcodeReg: text("phcode_reg"),
  phcodeProv: text("phcode_prov"),
  phcodeMun: text("phcode_mun"),
  phcodeBgy: text("phcode_bgy"),

  // Additional Codes
  regCode1: text("reg_code1"),
  provCode1: text("prov_code1"),
  munCode1: text("mun_code1"),
  bgyCode1: text("bgy_code1"),

  // District/Misc
  distCode: text("dist_code"),
  district: text("district"),
  cityClass: text("city_class"),

  // Coordinates
  latitude: real("latitude"),
  longitude: real("longitude"),

  // Metadata
  lastSyncedAt: timestamp("last_synced_at", { mode: 'date' }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'date' }).notNull().defaultNow(),
});

export type PsgcLocation = typeof psgcLocations.$inferSelect;
export type NewPsgcLocation = typeof psgcLocations.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
