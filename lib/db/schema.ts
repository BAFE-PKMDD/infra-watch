import {
  boolean,
  date,
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
  customType,
} from "drizzle-orm/pg-core";
import type { GeoTrackPoint, StoredIssueEvidenceItem } from "@/types/geo-evidence.types";
import type { FeedbackMedia } from "@/types/feedback.types";

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
    abc: numeric("abc", { precision: 14, scale: 2, mode: "number" }),
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

export const projectDataCorrections = pgTable(
  "project_data_corrections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.abemisId, { onDelete: "restrict" }),
    field: text("field").notNull(),
    sourceValue: jsonb("source_value"),
    correctedValue: jsonb("corrected_value").notNull(),
    reason: text("reason").notNull(),
    correctedBy: text("corrected_by").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    projectFieldUnique: uniqueIndex("project_data_corrections_project_field_uidx").on(table.projectId, table.field),
    projectIdIdx: index("project_data_corrections_project_id_idx").on(table.projectId),
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
    media: jsonb("media").$type<FeedbackMedia[]>().default([]),
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
    publicDescription: text("public_description"),
    publicApprovedAt: timestamp("public_approved_at", { mode: "date" }),
    publicApprovedBy: text("public_approved_by"),
    region: text("region"),
    province: text("province"),
    municipality: text("municipality"),
    barangay: text("barangay"),
    landmark: text("landmark"),
    latitude: real("latitude"),
    longitude: real("longitude"),
    evidence: jsonb("evidence").$type<StoredIssueEvidenceItem[]>().default([]),
    geoVideoTrack: jsonb("geo_video_track").$type<GeoTrackPoint[]>(),
    geoVideoUrl: text("geo_video_url"),
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

export const projectMetricSnapshots = pgTable(
  "project_metric_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.abemisId, { onDelete: "cascade" }),
    syncLogId: uuid("sync_log_id")
      .notNull()
      .references(() => syncLogs.id, { onDelete: "cascade" }),
    captureDate: date("capture_date", { mode: "string" }).notNull(),
    capturedAt: timestamp("captured_at", { mode: "date" }).notNull(),
    physicalProgress: integer("physical_progress"),
    financialProgress: integer("financial_progress"),
    budget: numeric("budget", { precision: 14, scale: 2 }),
    abc: numeric("abc", { precision: 14, scale: 2, mode: "number" }),
    program: text("program"),
    region: text("region"),
    province: text("province"),
    yearFunded: text("year_funded"),
    projectType: text("project_type"),
    status: text("status").notNull(),
    targetCompletionDate: timestamp("target_completion_date", { mode: "date" }),
    sourceLastSyncedAt: timestamp("source_last_synced_at", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    projectDayUnique: uniqueIndex(
      "project_metric_snapshots_project_day_uidx",
    ).on(table.projectId, table.captureDate),
    projectCaptureDateIdx: index(
      "project_metric_snapshots_project_capture_date_idx",
    ).on(table.projectId, table.captureDate),
    captureDateIdx: index("project_metric_snapshots_capture_date_idx").on(
      table.captureDate,
    ),
    statusCaptureDateIdx: index(
      "project_metric_snapshots_status_capture_date_idx",
    ).on(table.status, table.captureDate),
  }),
);

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

export const chatHistory = pgTable(
  "ai_chat_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id").notNull(),
    ownerKey: text("owner_key").notNull(),
    surface: text("surface").notNull().default("public_chat"),
    userId: text("user_id"),
    userMessage: text("user_message").notNull(),
    assistantMessage: text("assistant_message"),
    status: text("status").notNull().default("processing"),
    provider: text("provider").notNull(),
    model: text("model"),
    toolNames: jsonb("tool_names").$type<string[]>().default([]),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    totalTokens: integer("total_tokens"),
    durationMs: integer("duration_ms"),
    finishReason: text("finish_reason"),
    errorCode: text("error_code"),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    conversationIdIdx: index("ai_chat_history_conversation_id_idx").on(
      table.conversationId,
    ),
    ownerConversationIdx: index("ai_chat_history_owner_conversation_idx").on(
      table.ownerKey,
      table.conversationId,
    ),
    userIdIdx: index("ai_chat_history_user_id_idx").on(table.userId),
    statusIdx: index("ai_chat_history_status_idx").on(table.status),
    createdAtIdx: index("ai_chat_history_created_at_idx").on(table.createdAt),
    expiresAtIdx: index("ai_chat_history_expires_at_idx").on(table.expiresAt),
  }),
);

export const chatRateLimits = pgTable(
  "ai_chat_rate_limits",
  {
    key: text("key").primaryKey(),
    windowStartedAt: timestamp("window_started_at", { mode: "date" }).notNull(),
    requestCount: integer("request_count").notNull().default(1),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    updatedAtIdx: index("ai_chat_rate_limits_updated_at_idx").on(table.updatedAt),
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
export type ChatHistory = typeof chatHistory.$inferSelect;
export type NewChatHistory = typeof chatHistory.$inferInsert;

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    createdAtIdx: index("notifications_created_at_idx").on(table.createdAt),
  }),
);

export const notificationRecipients = pgTable(
  "notification_recipients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    notificationId: text("notification_id")
      .notNull()
      .references(() => notifications.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { mode: "date" }),
  },
  (table) => ({
    userNotificationIdx: uniqueIndex("notification_recipients_user_notification_idx").on(
      table.userId,
      table.notificationId,
    ),
    userIdx: index("notification_recipients_user_id_idx").on(table.userId),
    notificationIdx: index("notification_recipients_notification_id_idx").on(
      table.notificationId,
    ),
  }),
);

export type NotificationRow = typeof notifications.$inferSelect;
export type NewNotificationRow = typeof notifications.$inferInsert;
export type NotificationRecipientRow = typeof notificationRecipients.$inferSelect;
