import assert from "node:assert/strict";
import { afterAll, mock, spyOn, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CitizenGuideContext } from "./citizen-guide-context";
import * as navigation from "next/navigation";
import * as nextThemes from "next-themes";
import * as i18n from "@/i18n";
import * as publicProjectsQuery from "@/actions/query/public-projects.query";
import * as locationOptions from "@/actions/query/get-location-options";

let query = "view=map&search=existing-filter";
// spyOn() mutates these real singletons in place and is undone in afterAll() below.
// mock.module() (used previously) replaces the module for the rest of the bun:test
// process, not just this file, with no reliable way to undo it afterward.
spyOn(navigation, "usePathname").mockReturnValue("/projects");
spyOn(navigation, "useSearchParams").mockImplementation((() => new URLSearchParams(query)) as unknown as typeof navigation.useSearchParams);
spyOn(navigation, "useRouter").mockReturnValue({ replace: () => {} } as unknown as ReturnType<typeof navigation.useRouter>);
spyOn(nextThemes, "useTheme").mockReturnValue({ theme: "light" } as ReturnType<typeof nextThemes.useTheme>);
spyOn(i18n, "useTranslation").mockReturnValue({ t: (key: string) => key === "directory.table.viewDetails" ? "View details" : key } as ReturnType<typeof i18n.useTranslation>);
spyOn(publicProjectsQuery, "getPublicProjects").mockImplementation(async () => { throw new Error("Example must not fetch real projects"); });
spyOn(publicProjectsQuery, "getPublicMapPins").mockImplementation(async () => []);
spyOn(publicProjectsQuery, "getPublicMapProjectDetails").mockImplementation(async () => null);
spyOn(locationOptions, "getRegions").mockImplementation(async () => []);
spyOn(locationOptions, "getProvinces").mockImplementation(async () => []);
spyOn(locationOptions, "getMunicipalities").mockImplementation(async () => []);
spyOn(locationOptions, "getBarangays").mockImplementation(async () => []);

const { default: ProjectsCatalog } = await import("@/app/(public)/projects/projects-directory-client");
afterAll(() => { mock.restore(); });

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
