import assert from "node:assert/strict";
import { mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CitizenGuideContext } from "./citizen-guide-context";

let query = "view=map&search=existing-filter";
mock.module("next/navigation", () => ({ usePathname: () => "/projects", useSearchParams: () => new URLSearchParams(query), useRouter: () => ({ replace: () => {} }) }));
mock.module("next-themes", () => ({ useTheme: () => ({ theme: "light" }) }));
mock.module("@/i18n", () => ({ useTranslation: () => ({ t: (key: string) => key === "directory.table.viewDetails" ? "View details" : key }) }));
mock.module("@/actions/query/public-projects.query", () => ({ getPublicProjects: async () => { throw new Error("Example must not fetch real projects"); }, getPublicMapPins: async () => [], getPublicMapProjectDetails: async () => null }));
mock.module("@/actions/query/get-location-options", () => ({ getRegions: async () => [], getProvinces: async () => [], getMunicipalities: async () => [], getBarangays: async () => [] }));

const { default: ProjectsCatalog } = await import("@/app/(public)/projects/projects-directory-client");

function render(active: boolean) {
  return renderToStaticMarkup(<QueryClientProvider client={new QueryClient()}><CitizenGuideContext.Provider value={{
    session: active ? { id: "attempt", guide: "citizen-feedback", returnTo: "/", submitted: false } : null,
    active, loading: false, start: () => {}, overview: () => {}, submitted: () => {},
  }}><ProjectsCatalog /></CitizenGuideContext.Provider></QueryClientProvider>);
}

test("the feedback guide renders an example in the real directory with View details links on desktop and mobile", () => {
  const html = render(true);
  assert.match(html, /<table/);
  assert.match(html, /Example irrigation canal/);
  const links = [...html.matchAll(/<a\b[^>]*data-citizen="project-view-details"[^>]*>[\s\S]*?<\/a>/g)].map(([link]) => link);
  assert.equal(links.length, 2);
  for (const link of links) {
    assert.match(link, /href="\/projects\/tutorial-citizen-project\?/);
    assert.match(link, /tab=feedback/);
    assert.match(link, /View details/);
    assert.doesNotMatch(link, /<button/, "navigation must not nest a button inside a link");
  }
});

test("ordinary directory visits never display tutorial records or guide targets", () => {
  query = "";
  const html = render(false);
  assert.doesNotMatch(html, /tutorial-citizen-project|Example irrigation canal|project-view-details/);
});
