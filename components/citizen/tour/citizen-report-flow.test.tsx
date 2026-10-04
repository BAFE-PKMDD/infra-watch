import assert from "node:assert/strict";
import { mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CitizenGuideContext } from "./citizen-guide-context";
import { CITIZEN_PROJECT_ID } from "@/lib/tours/citizen";

const queries: Array<{ queryKey: unknown[]; queryFn: () => Promise<unknown>; enabled?: boolean }> = [];
mock.module("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(), useRouter: () => ({ push: () => {} }) }));
mock.module("@/providers/auth-provider", () => ({ useAuth: () => ({ user: { id: "citizen", role: "citizen" }, isLoading: false }) }));
mock.module("@/i18n", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
mock.module("@tanstack/react-query", () => ({ useQuery: (options: typeof queries[number]) => { queries.push(options); return { data: [], isFetching: false }; } }));
mock.module("@/actions/query/get-location-options", () => ({ getRegions: async () => [], getProvinces: async () => [], getMunicipalities: async () => [], getBarangays: async () => [] }));
mock.module("@/hooks/use-submission-survey-gate", () => ({ useSubmissionSurveyGate: () => ({ needsSurvey: false }) }));
mock.module("@/components/shared/submission-survey-modal", () => ({ SubmissionSurveyModal: () => null }));
mock.module("@/components/shared/geo-evidence-upload", () => ({ GeoEvidenceUpload: () => null }));

const { default: ReportIssuePage } = await import("@/app/(public)/report-issue/new/report-issue-form");
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
