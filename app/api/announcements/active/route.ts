import { getActiveAnnouncement } from "@/lib/content-management";

export async function GET() {
  const announcement = await getActiveAnnouncement();
  return Response.json(
    {
      data: announcement
        ? {
            id: announcement.id,
            title: announcement.title,
            content: announcement.content,
            updatedAt: announcement.updatedAt,
          }
        : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
