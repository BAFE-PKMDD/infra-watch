import assert from "node:assert/strict";
import { afterAll, mock, spyOn, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CitizenGuideContext } from "./citizen-guide-context";
import { CITIZEN_PROJECT_ID } from "@/lib/tours/citizen";
import * as navigation from "next/navigation";
import * as authProvider from "@/providers/auth-provider";
import * as i18n from "@/i18n";
import * as reactQuery from "@tanstack/react-query";
import * as locationOptions from "@/actions/query/get-location-options";
import * as surveyGate from "@/hooks/use-submission-survey-gate";
import * as surveyModal from "@/components/shared/submission-survey-modal";
import * as geoEvidence from "@/components/shared/geo-evidence-upload";

const queries: Array<{ queryKey: unknown[]; queryFn: () => Promise<unknown>; enabled?: boolean }> = [];
// spyOn() mutates these real singletons in place and is undone in afterAll() below.
// mock.module() (used previously) replaces the module for the rest of the bun:test
// process, not just this file, with no reliable way to undo it afterward.
spyOn(navigation, "useSearchParams").mockReturnValue(new URLSearchParams() as unknown as ReturnType<typeof navigation.useSearchParams>);
spyOn(navigation, "useRouter").mockReturnValue({ push: () => {} } as unknown as ReturnType<typeof navigation.useRouter>);
spyOn(authProvider, "useAuth").mockReturnValue({ user: { id: "citizen", role: "citizen" }, isLoading: false } as unknown as ReturnType<typeof authProvider.useAuth>);
spyOn(i18n, "useTranslation").mockReturnValue({ t: (key: string) => key } as unknown as ReturnType<typeof i18n.useTranslation>);
spyOn(reactQuery, "useQuery").mockImplementation(((options: typeof queries[number]) => { queries.push(options); return { data: [], isFetching: false }; }) as unknown as typeof reactQuery.useQuery);
spyOn(locationOptions, "getRegions").mockImplementation(async () => []);
spyOn(locationOptions, "getProvinces").mockImplementation(async () => []);
spyOn(locationOptions, "getMunicipalities").mockImplementation(async () => []);
spyOn(locationOptions, "getBarangays").mockImplementation(async () => []);
spyOn(surveyGate, "useSubmissionSurveyGate").mockReturnValue({ needsSurvey: false } as unknown as ReturnType<typeof surveyGate.useSubmissionSurveyGate>);
spyOn(surveyModal, "SubmissionSurveyModal").mockImplementation((() => null) as unknown as typeof surveyModal.SubmissionSurveyModal);
spyOn(geoEvidence, "GeoEvidenceUpload").mockImplementation((() => null) as unknown as typeof geoEvidence.GeoEvidenceUpload);

const { default: ReportIssuePage } = await import("@/app/(public)/report-issue/new/report-issue-form");
afterAll(() => { mock.restore(); });
const context = {
  session: { id: "attempt", guide: "citizen-report" as const, returnTo: "/", submitted: false },
  active: true, loading: false, start: () => {}, overview: () => {}, submitted: () => {},
};

test("the example E-Report starts at the same farm-operation choice as a real new report", () => {
  const normal = renderToStaticMarkup(<ReportIssuePage />);
  const example = renderToStaticMarkup(<CitizenGuideContext.Provider value={context}><ReportIssuePage /></CitizenGuideContext.Provider>);
  for (const html of [normal, example]) {
    assert.match(html, /data-citizen-step="report-farm-operation"/);
    assert.doesNotMatch(html, /data-citizen-step="report-project-search"/);
    const next = html.match(/<button\b[^>]*data-citizen="form-next"[^>]*>/)?.[0];
    assert.ok(next, "the guide needs the actual form's forward control");
    assert.match(next, /disabled/, "Next stays unavailable until a farm operation is selected");
  }
});

test("guide matching uses isolated example results without requesting real project records", async () => {
  queries.length = 0;
  renderToStaticMarkup(<CitizenGuideContext.Provider value={context}><ReportIssuePage /></CitizenGuideContext.Provider>);
  const match = queries.find(({ queryKey }) => queryKey[0] === "citizen-guide-project-suggestions");
  assert.ok(match);
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = mock(async () => { requests++; throw new Error("No real project lookup expected"); }) as typeof fetch;
  try {
    const results = await match.queryFn() as Array<{ id: string }>;
    assert.deepEqual(results.map(({ id }) => id), [CITIZEN_PROJECT_ID]);
    assert.equal(requests, 0);
    assert.equal(queries.find(({ queryKey }) => queryKey[0] === "citizen-guide-project-type-suggestions")?.enabled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
