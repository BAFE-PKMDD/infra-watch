import { getPublicArticles } from "@/lib/content-management";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  return Response.json(
    await getPublicArticles({
      search: params.get("search") ?? undefined,
      category: params.get("category") || undefined,
      page: Number(params.get("page") || 1),
      projectId: params.get("projectId") || undefined,
    }),
  );
}
