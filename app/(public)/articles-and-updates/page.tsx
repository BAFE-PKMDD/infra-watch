import { ArticlesDirectory } from "@/components/articles/articles-directory";
import { getPublicArticles } from "@/lib/content-management";
export const metadata = { title: "Articles & Updates | INFRA Watch" };
export const dynamic = "force-dynamic";
export default async function Page() {
  return <ArticlesDirectory initial={await getPublicArticles()} />;
}
