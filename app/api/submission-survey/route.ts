import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { submissionSurveys } from "@/lib/db/schema";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

export const RESPONDENT_TYPE_VALUES = [
  "student",
  "farmer",
  "normal_citizen",
  "bafe_employee",
  "raed_staff",
  "other",
] as const;

export const submissionSurveySchema = z
  .object({
    sourceType: z.enum(["feedback", "e_report"]),
    sourceId: z.string().trim().max(100).optional().nullable(),
    skipped: z.boolean().optional().default(false),
    respondentType: z.enum(RESPONDENT_TYPE_VALUES).optional().nullable(),
    name: z.string().trim().max(100).optional().nullable(),
    age: z.preprocess(
      (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
      z.number().int().min(1, "Age must be at least 1").max(120, "Age must be at most 120").optional().nullable(),
    ),
    gender: z.string().trim().max(50).optional().nullable(),
    referralSource: z.enum(["facebook", "website", "instagram", "other"]).optional().nullable(),
  })
  .refine((data) => data.skipped || Boolean(data.respondentType), {
    message: "Please let us know who's answering.",
    path: ["respondentType"],
  })
  .refine((data) => data.skipped || Boolean(data.referralSource), {
    message: "Please let us know how you found out about us.",
    path: ["referralSource"],
  });

export type SubmissionSurveyInput = z.infer<typeof submissionSurveySchema>;

type SaveSurveyInput = {
  sourceType: "feedback" | "e_report";
  sourceId: string | null;
  userId: string | null;
  skipped: boolean;
  respondentType: (typeof RESPONDENT_TYPE_VALUES)[number] | null;
  name: string | null;
  age: number | null;
  gender: string | null;
  referralSource: "facebook" | "website" | "instagram" | "other" | null;
};

type RouteDependencies = {
  getSession?: (req: NextRequest) => Promise<{ user?: { id?: string } } | null>;
  saveSurvey?: (data: SaveSurveyInput) => Promise<{ id: string }>;
};

let tableEnsured = false;

async function defaultEnsureTableExists() {
  if (tableEnsured) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS submission_surveys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_type TEXT NOT NULL,
        source_id TEXT,
        user_id TEXT,
        respondent_type TEXT,
        name TEXT,
        age INTEGER,
        gender TEXT,
        referral_source TEXT,
        skipped BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL
      );
      ALTER TABLE submission_surveys ADD COLUMN IF NOT EXISTS respondent_type TEXT;
      ALTER TABLE submission_surveys ADD COLUMN IF NOT EXISTS skipped BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE submission_surveys ALTER COLUMN referral_source DROP NOT NULL;
      CREATE INDEX IF NOT EXISTS submission_surveys_source_type_idx ON submission_surveys(source_type);
      CREATE INDEX IF NOT EXISTS submission_surveys_referral_source_idx ON submission_surveys(referral_source);
      CREATE INDEX IF NOT EXISTS submission_surveys_created_at_idx ON submission_surveys(created_at);
      CREATE INDEX IF NOT EXISTS submission_surveys_user_id_idx ON submission_surveys(user_id);
    `);
    tableEnsured = true;
  } catch (error) {
    console.warn("Table auto-creation skipped or already exists:", error instanceof Error ? error.message : error);
  }
}

async function defaultSaveSurvey(data: SaveSurveyInput) {
  await defaultEnsureTableExists();
  const [inserted] = await db
    .insert(submissionSurveys)
    .values({
      sourceType: data.sourceType,
      sourceId: data.sourceId,
      userId: data.userId,
      skipped: data.skipped,
      respondentType: data.respondentType,
      name: data.name,
      age: data.age,
      gender: data.gender,
      referralSource: data.referralSource,
    })
    .returning();

  return { id: inserted.id };
}

export function createSubmissionSurveyHandler(deps: RouteDependencies = {}) {
  const getSession = deps.getSession ?? (async (req: NextRequest) => auth.api.getSession({ headers: req.headers }).catch(() => null));
  const saveSurvey = deps.saveSurvey ?? defaultSaveSurvey;

  return async function POST(request: NextRequest) {
    try {
      const session = await getSession(request);
      const body = await request.json().catch(() => null);

      if (!body || typeof body !== "object") {
        return NextResponse.json(
          { success: false, error: "Invalid request payload." },
          { status: 400 },
        );
      }

      const parsed = submissionSurveySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: parsed.error.issues[0]?.message || "Validation failed." },
          { status: 400 },
        );
      }

      const saved = await saveSurvey({
        sourceType: parsed.data.sourceType,
        sourceId: parsed.data.sourceId || null,
        userId: session?.user?.id || null,
        skipped: parsed.data.skipped,
        respondentType: parsed.data.respondentType || null,
        name: parsed.data.name || null,
        age: parsed.data.age ?? null,
        gender: parsed.data.gender || null,
        referralSource: parsed.data.referralSource || null,
      });

      return NextResponse.json({
        success: true,
        data: { id: saved.id },
        message: "Thank you for your feedback!",
      }, { status: 201 });
    } catch (error) {
      console.error("Failed to store submission survey:", error);
      return NextResponse.json(
        { success: false, error: "Failed to submit survey. Please try again later." },
        { status: 500 },
      );
    }
  };
}

export const POST = createSubmissionSurveyHandler();
