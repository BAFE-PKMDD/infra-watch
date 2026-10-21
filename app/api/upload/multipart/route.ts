import { z } from "zod";
import {
  abortDirectUpload,
  completeDirectUpload,
  createDirectUpload,
  ownedUpload,
  presignPart,
} from "@/lib/direct-video-upload";
import { apiError, jsonBody, requireStaffApi } from "@/lib/staff-api";

async function actor() {
  const user = await requireStaffApi();
  if (user.role !== "admin" && user.role !== "regional_admin")
    throw Object.assign(
      new Error("Only video managers can upload recordings"),
      { status: 403 },
    );
  return user;
}
export async function POST(request: Request) {
  try {
    const user = await actor();
    return Response.json(
      await createDirectUpload(user.id, await jsonBody(request)),
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function GET(request: Request) {
  try {
    const user = await actor();
    const params = new URL(request.url).searchParams;
    const upload = await ownedUpload(user.id, params.get("id") || "");
    return Response.json({
      url: await presignPart(upload, Number(params.get("part"))),
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function PUT(request: Request) {
  try {
    const user = await actor();
    const input = z
      .object({
        id: z.uuid(),
        parts: z
          .array(
            z.object({
              partNumber: z.number().int(),
              etag: z.string().max(100),
            }),
          )
          .max(500)
          .default([]),
      })
      .parse(await jsonBody(request, 65536));
    return Response.json({
      path: await completeDirectUpload(
        await ownedUpload(user.id, input.id),
        input.parts,
      ),
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(request: Request) {
  try {
    const user = await actor();
    const { id } = z.object({ id: z.uuid() }).parse(await jsonBody(request));
    await abortDirectUpload(await ownedUpload(user.id, id));
    return Response.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
