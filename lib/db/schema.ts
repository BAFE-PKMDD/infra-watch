import { sql } from "drizzle-orm";
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
import type { MydasPageData } from "@/types/mydas.types";
import type { SmsMockScenario } from "@/types/sms-grievance.types";

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
    farmOperation: text("farm_operation"),
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
    sentiment: text("sentiment"), // 'positive' | 'negative', citizen-provided, optional
    // " | "-joined issue type labels from the same picker e-report uses, only ever
    // collected when category is "concerns" - see lib/abemis/issue-type-map.ts.
    issueType: text("issue_type"),
    media: jsonb("media").$type<FeedbackMedia[]>().default([]),
    isAnonymous: boolean("is_anonymous").notNull().default(false),
    helpfulCount: integer("helpful_count").notNull().default(0),
    status: text("status").notNull().default("pending"),
    moderatedBy: text("moderated_by"),
    moderatedAt: timestamp("moderated_at", { mode: "date" }),
    moderationNote: text("moderation_note"),
    autoAcknowledgedAt: timestamp("auto_acknowledged_at", { mode: "date" }),
    // SLA follow-up reminder checkpoints (24h moderator nudge, 60h moderator+admin
    // escalation, 72h admin breach alert). Each is set once its reminder has been sent,
    // so the follow-up job never re-notifies the same checkpoint twice.
    slaGentleReminderAt: timestamp("sla_gentle_reminder_at", { mode: "date" }),
    slaUrgentReminderAt: timestamp("sla_urgent_reminder_at", { mode: "date" }),
    slaBreachNotifiedAt: timestamp("sla_breach_notified_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    projectIdIdx: index("feedback_project_id_idx").on(table.projectId),
    statusIdx: index("feedback_status_idx").on(table.status),
    sentimentIdx: index("feedback_sentiment_idx").on(table.sentiment),
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
    issueType: text("issue_type"),
    status: text("status").notNull().default("submitted"),
    priority: text("priority").notNull().default("normal"),
    description: text("description").notNull(),
    publicDescription: text("public_description"),
    publicApprovedAt: timestamp("public_approved_at", { mode: "date" }),
    publicApprovedBy: text("public_approved_by"),
    // Citizen-selected classification hints when no specific project is matched; unverified, unlike projects.farm_operation/project_type.
    reportedFarmOperation: text("reported_farm_operation"),
    reportedProjectType: text("reported_project_type"),
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
    // SLA follow-up reminder checkpoints — see the same fields on `feedback` above.
    slaGentleReminderAt: timestamp("sla_gentle_reminder_at", { mode: "date" }),
    slaUrgentReminderAt: timestamp("sla_urgent_reminder_at", { mode: "date" }),
    slaBreachNotifiedAt: timestamp("sla_breach_notified_at", { mode: "date" }),
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

export const contactMessages = pgTable(
  "contact_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    status: text("status").$type<"new" | "in_progress" | "resolved">().default("new").notNull(),
    userId: text("user_id"),
    senderKey: text("sender_key").notNull(),
    handledBy: text("handled_by"),
    handledAt: timestamp("handled_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    createdAtIdx: index("contact_messages_created_at_idx").on(table.createdAt),
    statusIdx: index("contact_messages_status_idx").on(table.status, table.createdAt),
    senderKeyIdx: index("contact_messages_sender_key_idx").on(table.senderKey, table.createdAt),
  }),
);

export type ContactMessage = typeof contactMessages.$inferSelect;
export type NewContactMessage = typeof contactMessages.$inferInsert;

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

export const mydasDashboards = pgTable(
  "mydas_dashboards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().default("Untitled Dashboard"),
    // Full pages/elements tree (charts + labels, positions, styling) as a single
    // JSON document — this is saved UI state, not normalized relational data.
    pages: jsonb("pages").notNull().$type<MydasPageData[]>(),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    createdByIdx: index("mydas_dashboards_created_by_idx").on(table.createdBy),
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

export const kbDocuments = pgTable(
  "kb_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    category: text("category").notNull(),
    fileType: text("file_type").notNull(),
    fileName: text("file_name"),
    filePath: text("file_path"),
    fileSize: integer("file_size"),
    chunkCount: integer("chunk_count").notNull().default(0),
    status: text("status").notNull().default("pending"),
    // 'public' is searchable from both ARIA surfaces; 'admin_only' is filtered out
    // of any search made from the public citizen surface (enforced in kb-search.ts,
    // not left to the model to self-restrict).
    visibility: text("visibility").notNull().default("public"),
    faqQuestion: text("faq_question"),
    faqAnswer: text("faq_answer"),
    contentPreview: text("content_preview"),
    errorMessage: text("error_message"),
    uploadedBy: text("uploaded_by").notNull(),
    uploadedByName: text("uploaded_by_name").notNull(),
    archivedAt: timestamp("archived_at", { mode: "date" }),
    archivedBy: text("archived_by"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    statusIdx: index("kb_documents_status_idx").on(table.status),
    categoryIdx: index("kb_documents_category_idx").on(table.category),
    visibilityIdx: index("kb_documents_visibility_idx").on(table.visibility),
    archivedAtIdx: index("kb_documents_archived_at_idx").on(table.archivedAt),
    createdAtIdx: index("kb_documents_created_at_idx").on(table.createdAt),
  }),
);

export const kbChunks = pgTable(
  "kb_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => kbDocuments.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    embedding: jsonb("embedding").$type<number[]>(),
    tokenCount: integer("token_count"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    documentIdIdx: index("kb_chunks_document_id_idx").on(table.documentId),
    documentChunkIdx: uniqueIndex("kb_chunks_document_chunk_uidx").on(
      table.documentId,
      table.chunkIndex,
    ),
  }),
);

export type KbDocument = typeof kbDocuments.$inferSelect;
export type NewKbDocument = typeof kbDocuments.$inferInsert;
export type KbChunk = typeof kbChunks.$inferSelect;
export type NewKbChunk = typeof kbChunks.$inferInsert;

export const liveVideos = pgTable(
  "live_videos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description"),
    videoType: text("video_type").notNull().default("facebook_live"),
    region: text("region"),
    approvalStatus: text("approval_status").notNull().default("pending"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { mode: "date" }),
    facebookVideoUrl: text("facebook_video_url"),
    videoPath: text("video_path"),
    thumbnailPath: text("thumbnail_path"),
    duration: integer("duration"),
    isActive: boolean("is_active").notNull().default(false),
    isFeatured: boolean("is_featured").notNull().default(false),
    isLive: boolean("is_live").notNull().default(false),
    displayOrder: integer("display_order").notNull().default(0),
    publishedAt: timestamp("published_at", { mode: "date" }),
    expiresAt: timestamp("expires_at", { mode: "date" }),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    activeScheduleIdx: index("live_videos_active_schedule_idx").on(
      table.isActive,
      table.publishedAt,
      table.expiresAt,
    ),
    createdAtIdx: index("live_videos_created_at_idx").on(table.createdAt),
    singleLiveIdx: uniqueIndex("live_videos_single_live_uidx")
      .on(table.isLive)
      .where(sql`${table.isLive} = true`),
  }),
);

export type LiveVideo = typeof liveVideos.$inferSelect;
export type NewLiveVideo = typeof liveVideos.$inferInsert;

export type NotificationRow = typeof notifications.$inferSelect;
export type NewNotificationRow = typeof notifications.$inferInsert;
export type NotificationRecipientRow = typeof notificationRecipients.$inferSelect;

export const submissionSurveys = pgTable(
  "submission_surveys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceType: text("source_type").notNull(), // 'feedback' | 'e_report'
    sourceId: text("source_id"), // feedback id or issue ticket/id (optional; null when the survey ran before submission)
    userId: text("user_id"), // optional user id
    respondentType: text("respondent_type"), // 'student' | 'farmer' | 'normal_citizen' | 'bafe_employee' | 'raed_staff' | 'other'
    name: text("name"), // optional citizen name
    age: integer("age"),
    gender: text("gender"),
    referralSource: text("referral_source"), // 'facebook' | 'website' | 'instagram' | 'other'; null when skipped
    skipped: boolean("skipped").default(false).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    sourceTypeIdx: index("submission_surveys_source_type_idx").on(table.sourceType),
    referralSourceIdx: index("submission_surveys_referral_source_idx").on(table.referralSource),
    createdAtIdx: index("submission_surveys_created_at_idx").on(table.createdAt),
    userIdIdx: index("submission_surveys_user_id_idx").on(table.userId),
  }),
);

export type SubmissionSurvey = typeof submissionSurveys.$inferSelect;
export type NewSubmissionSurvey = typeof submissionSurveys.$inferInsert;

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventName: text("event_name").notNull(),
    occurredAt: timestamp("occurred_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    routeTemplate: text("route_template").notNull(),
    resourceType: text("resource_type"),
    resourceId: text("resource_id"),
    entrySurface: text("entry_surface").notNull(),
    resultCountBand: text("result_count_band"),
    networkRegionCode: text("network_region_code"),
  },
  (table) => ({
    occurredAtIdx: index("analytics_events_occurred_at_idx").on(table.occurredAt),
    eventOccurredAtIdx: index("analytics_events_event_occurred_at_idx").on(table.eventName, table.occurredAt),
    resourceOccurredAtIdx: index("analytics_events_resource_occurred_at_idx").on(table.resourceType, table.resourceId, table.occurredAt),
  }),
);

export const analyticsDailyAggregates = pgTable(
  "analytics_daily_aggregates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    aggregateDate: date("aggregate_date", { mode: "string" }).notNull(),
    metricKey: text("metric_key").notNull(),
    dimensionKey: text("dimension_key").notNull().default("all"),
    dimensionValue: text("dimension_value").notNull().default("all"),
    resourceType: text("resource_type").notNull().default("all"),
    resourceId: text("resource_id").notNull().default("all"),
    count: integer("count").notNull().default(0),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    aggregateKeyIdx: uniqueIndex("analytics_daily_aggregates_key_uidx").on(
      table.aggregateDate,
      table.metricKey,
      table.dimensionKey,
      table.dimensionValue,
      table.resourceType,
      table.resourceId,
    ),
    dateMetricIdx: index("analytics_daily_aggregates_date_metric_idx").on(table.aggregateDate, table.metricKey),
  }),
);

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;
export type AnalyticsDailyAggregate = typeof analyticsDailyAggregates.$inferSelect;

/**
 * System settings table - generic key/value store for admin-configurable settings
 * (e.g. auto-reply/auto-accept configuration)
 */
export const systemSettings = pgTable("system_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  description: text("description"),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type NewSystemSetting = typeof systemSettings.$inferInsert;

export const userTourProgress = pgTable("user_tour_progress", {
  userId: text("user_id").primaryKey(),
  automatic: boolean("automatic").notNull().default(true),
  seen: jsonb("seen").$type<Record<string, "completed" | "skipped">>().notNull().default({}),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

/**
 * Staff review state for a message that arrived on the live SMS grievance line. The line
 * itself stays the source of truth for the original text, sender, and time; this row only
 * holds what staff did with it (tags, routing, status, the SMS thread InfraWatch sent and
 * received). Keyed by the live message id so the review page can overlay it on the feed.
 * `version` is bumped on every write so two staff acting on the same message can't both
 * send the same real SMS.
 */
export const smsGrievanceReviews = pgTable(
  "sms_grievance_reviews",
  {
    messageId: text("message_id").primaryKey(),
    record: jsonb("record").$type<SmsMockScenario>().notNull(),
    version: integer("version").notNull().default(1),
    updatedBy: text("updated_by"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    updatedAtIdx: index("sms_grievance_reviews_updated_at_idx").on(table.updatedAt),
  }),
);

export type SmsGrievanceReviewRow = typeof smsGrievanceReviews.$inferSelect;
