# InfraWatch Development Roadmap and Presentation Next Steps

**Prepared for:** Ran Ray Alcantara
**Purpose:** Presentation-ready summary of what InfraWatch already delivers, what is only partial, what must be fixed, and what should be developed next
**Review date:** 2026-08-26 (Asia/Manila)
**Repository reviewed:** `infra-watch`

---

## 1. Executive message for the presentation

InfraWatch already has a substantial working foundation: a synchronized infrastructure project repository, public project directory, public analytics, source-backed maps, citizen reporting with geotagged evidence and GeoVideo support, protected managerial analytics, chart drill-through, an AI information assistant, moderation, notifications, synchronization monitoring, data-quality reporting, and administrative user controls.

The next phase is not another visual redesign. The priority is to close the accountability loop:

> **Report → validate → assign → acknowledge → act → resolve → notify → measure**

The strongest next-step proposal is therefore to complete secure complaint routing and case management, restore reliable source synchronization, release open-data export, improve map/data coverage, and then expand to SMS and more mature forecasting.

### Suggested one-minute presentation statement

> “InfraWatch consolidates AMEFIP infrastructure records into a searchable transparency portal with analytics, GIS monitoring, geotagged citizen evidence, GeoVideo support, issue tracking, and AI-assisted information access. The next phase will turn these capabilities into a complete accountability workflow by adding secure assignment, response deadlines, escalation, open-data export, SMS inclusion, and stronger source-data quality controls. We will preserve transparent limitations: current budget figures are approved allocations rather than expenditure, risk flags are explainable rules, and maps show only source-backed coordinates.”

---

## 2. Current evidence snapshot

These are the verified conditions observed during the review and should be understood before the demonstration:

- **Synchronized project records:** 25,916.
- **Projects with valid source-backed coordinates:** 16,541.
- **Projects omitted from maps because coordinates are unavailable or invalid:** 9,375.
- **Map coverage:** partial; missing coordinates are correctly omitted rather than invented.
- **Last successful project synchronization shown by the portal:** August 11, 2026, 3:33 PM.
- **Consecutive project synchronization failures after that success:** 10.
- **Latest failed scheduled attempt:** August 26, 2026 at approximately 2:00 AM Asia/Manila; it processed zero records and stored no diagnostic detail.
- **Latest focused notification/public-issue privacy verification:** 21 tests passed, 0 failed.
- **Latest dashboard/drill-through verification:** 81 focused tests passed, TypeScript passed, lint passed, production build passed, and all 48 static pages were generated.
- **Latest complete repository test run:** 387 passed, 1 skipped, and 1 unrelated landing-page spacing expectation failed.

### Immediate interpretation

The existing 25,916 records remain demonstrable, but the data is stale under the dashboard’s documented 26-hour freshness threshold. The system must not be presented as receiving real-time upstream updates until synchronization reliability and source cadence support that claim.

---

## 3. Supervisor innovation matrix: current status and next step

Status definitions:

- **Demonstrable:** Working capability can be shown now.
- **Demonstrable with qualification:** Working core exists, but a claim or workflow is incomplete.
- **Partial:** Important components exist, but the feature is not yet an end-to-end operational capability.
- **Not started:** No usable implementation was found.

| # | Supervisor innovation | Current status | What can be shown now | Required next step / truthful qualification |
|---|---|---|---|---|
| 1 | Infrastructure Analytics Dashboard | **Demonstrable with qualification** | Protected KPIs, filters, allocated-budget analysis, completion and schedule status, regional and project-type comparisons, priority projects, data coverage, freshness, executive brief, and project-level chart drill-through | Do not call approved allocation “expenditure” or “budget utilization.” The source has no confirmed expenditure/disbursement field. Risk status is rules-based. Completion forecasts are shown only where sufficient historical snapshots support them. Browser refresh is not real-time upstream data. |
| 2 | GeoVideo Documentation | **Partial** | Authenticated reporting supports geotagged image/video evidence, GPS sidecars, GeoVideo track storage, and synchronized map/video playback on authorized issue details | Public evidence currently includes approved project feedback, not issue evidence. Add explicit per-item publication approval, server-side metadata/provenance validation, before-and-after pairing, duplicate/tamper checks, capture-time disclosure, offline queueing, and a field validation workflow. GPS metadata strengthens evidence but does not make falsification impossible. |
| 3 | AI-Assisted Information Services | **Demonstrable with qualification** | Public ANIA assistant, project/portfolio questions, scoped managerial copilot, controlled analytics tools, chat history safeguards, and local/browser voice options | Complete approved FAQ/knowledge retrieval, source citations, administrator-managed prompts and voice providers, evaluation tests, accessibility QA, and governance for saved executive briefs. Keep answers advisory and scope-limited. |
| 4 | Enhanced Citizen e-Reporting | **Demonstrable with qualification** | Authenticated citizens can use guided issue reporting, project matching, location hierarchy, photos/videos/documents, geotagged evidence, owner tracking pages, official responses, and recipient-scoped in-app notifications | “Submit as anonymous” is not genuinely anonymous because sign-in and a contact number are still required; the number is then discarded. Fix this privacy inconsistency, unknown-location handling, noticed-date persistence, ticket uniqueness, accessibility, assignment, SLA/escalation, closure, and immutable history. |
| 5 | SMS Connect | **Not started** | No SMS provider, queue, template, consent, delivery receipt, or retry implementation was found | Start with a bounded opt-in pilot for report acknowledgement and status changes. Decide provider/procurement, sender identity, privacy/consent, message cost limits, templates, language, delivery receipts, retries, STOP/opt-out handling, and low-bandwidth fallback behavior. |
| 6 | Administrative Monitoring Dashboard | **Partial** | Protected managerial analytics, issue queue/detail, feedback moderation, data quality, synchronization logs, audit logs, user administration, scoped notifications, and executive brief | Add a role-scoped operations home for “Mine,” “Unassigned,” “Due soon,” “Breached,” sync failures, moderation backlog, and data-quality findings. Fix audit privacy and workflow integrity first. |
| 7 | Integrated Geospatial Infrastructure Map | **Partial** | Leaflet-based national map, source-backed project markers, project links, status coloring, project/program controls, evidence maps, and map coverage disclosure | Fix nonfunctional/misleading layer controls and legend, remove mock watershed/agricultural-zone polygons until real GeoServer layers exist, correct attribution, improve clustering/bounded loading, add region/province/type/status filters, and create a coordinate-correction workbench for the 9,375 omitted records. Never fabricate marker locations. |
| 8 | Unified Project Database | **Demonstrable with qualification** | Central PostgreSQL read model synchronized from the ABEMIS AMEFIP infrastructure endpoint, searchable project records, project passport/details, snapshots, data-quality checks, and protected/public views | Describe InfraWatch as a synchronized read model, not the authoritative origin. Restore sync reliability, retain source provenance, reconcile duplicate/legacy fields, document lifecycle semantics, introduce durable sync locking, and add backup/restore and reconciliation runbooks. |
| 9 | Open Data Export | **Not started** | The project directory contains a disabled “Export is coming soon” control; no CSV/JSON export endpoint was found | Implement filtered CSV and JSON export with a public data dictionary, source/freshness metadata, pagination or asynchronous large exports, formula-injection protection for CSV, rate limiting, safe field allowlists, and no private/moderation fields. |
| 10 | Automated Complaint Routing | **Not started / planned** | Geographic issue scoping and recipient-scoped staff notifications provide reusable foundations | Implement server-enforced assignee eligibility, admin assignment, moderator self-claim, responsible-office rules, reasons/history, concurrency protection, SLA enrollment, escalation, and reporter notifications. Never trust client-selected assignment scope. |
| 11 | Project Red Flag Monitoring | **Partial** | Explainable delayed/at-risk classification, schedule comparison, budget exposure, priority list, deterministic insights, and evidence-backed completion projections where history is sufficient | Add approved configurable thresholds, a durable watchlist/intervention register, owner and due date, reason codes, acknowledgement/resolution tracking, change history, and source-data quality qualification. “Over-budget” cannot be implemented until an authoritative actual-cost/expenditure field exists. |
| 12 | Multi-Infrastructure Monitoring | **Demonstrable with qualification** | The synchronized repository and project-type analytics already accommodate multiple infrastructure types rather than only farm-to-market roads | Add approved type-specific indicator templates, validation rules, terminology, evidence checklists, and analytics for warehouses, irrigation, greenhouses, fisheries, cold storage, renewable energy, and other supported classes. Do not assume one progress formula fits every type. |

---

## 4. Development feature backlog

### F01 — Secure complaint assignment, SLA, and escalation

**Priority:** P0 / highest
**Effort:** Large
**Outcome:** Every report has a clear accountable owner, response target, escalation path, and immutable history.

Minimum safe scope:

- Admin assignment/reassignment and moderator self-claim.
- Server-derived candidate eligibility using issue and user scope.
- Configurable versioned SLA policy; draft values cannot affect cases.
- Explicit administrative publication only after BAFE approves the policy.
- Acknowledgement and resolution deadlines captured per issue cycle.
- Transactional status transitions with required reasons/evidence.
- Durable, idempotent due-soon and breach escalation.
- “Mine,” “Unassigned,” “Due soon,” and “Breached” queues.
- Reporter notifications for acknowledgement, updates, resolution, and reopening.
- No automatic reassignment in the first version.

Dependencies:

- Audit-log privacy fix.
- Issue-retention/deletion policy.
- Official SLA values and approved clock/calendar rules.
- Verified production scheduler or external job invocation.

### F02 — Synchronization reliability and freshness operations

**Priority:** P0
**Effort:** Medium
**Outcome:** Managers know whether project data is current, and operators receive actionable failure details.

Minimum safe scope:

- Diagnose and resolve the 10 consecutive project-sync failures.
- Persist redacted failure reason/category and retryability.
- Durable database lock/lease across manual and scheduled sync.
- Run heartbeat and abandoned-run recovery.
- Request timeout and cancellation for upstream calls.
- Retry/backoff policy with operator-visible result.
- Failure notification to authorized operators.
- Next-run visibility and a documented manual recovery runbook.
- Reconciliation counts against the ABEMIS source.
- Run-wide duplicate detection and canonical/raw-ID reconciliation across every page, not only within each 50-record chunk.
- Explicit fetched, included, excluded-FMR, deduplicated, written, failed, and snapshot-capture counts.
- A documented partial-run policy: current chunk-by-chunk writes can leave partial updates if a later source page fails.
- Continue serving the last successful dataset with an explicit stale/failed warning.

### F03 — Public CSV/JSON export and data dictionary

**Priority:** P1
**Effort:** Medium
**Outcome:** Researchers and citizens can reuse the public data safely.

Minimum safe scope:

- Export respects the same validated public filters as the directory.
- Explicit public field allowlist.
- CSV and JSON formats.
- Source name and last successful synchronization timestamp.
- Machine-readable field definitions and monetary semantics.
- CSV formula-injection protection.
- Rate/row limits and asynchronous export for large results.
- Accessibility and download-state feedback.

### F04 — GIS reliability, coverage, and authentic layers

**Priority:** P1
**Effort:** Medium–Large
**Outcome:** The map becomes a truthful nationwide monitoring surface rather than only a marker demo.

Minimum safe scope:

- Remove or hide hard-coded watershed and agricultural-zone polygons.
- Integrate actual approved GeoServer WMS/WFS layers before relabeling controls.
- Correct base-map attribution.
- Make program toggles operate on program rather than project-type values.
- Make legend labels/colors match rendered markers.
- Add marker clustering or viewport/bounds queries instead of transferring every mapped project at once.
- Show mapped, omitted, and total counts.
- Add non-mutating coordinate-quality triage linked to the authoritative-source correction process.

### F05 — Operations command queue

**Priority:** P1
**Effort:** Medium
**Outcome:** Staff can see what needs action today across issues, moderation, synchronization, and data quality.

Minimum safe scope:

- Role-scoped operational inbox.
- Assigned owner, age, due state, severity, and next action.
- Saved views and URL-persisted filters.
- Direct deep links to authoritative records.
- No cross-region or cross-program leakage.
- No new project-data mutation from the Data Quality page.

### F06 — Project watchlist and intervention register

**Priority:** P1
**Effort:** Medium
**Outcome:** Red flags lead to documented management action rather than ending at a chart.

Minimum safe scope:

- Add/remove from a scoped internal watchlist.
- Reason, owner, due date, action, and status.
- Links to project and supporting evidence.
- Append-only action history.
- Data-version/freshness context.
- Separate rules-based warning from official determination.
- Add complete paginated drill-through and apply ordering before server limits; the current backend retains only 10 priority candidates and the UI displays five from that bounded set.

### F07 — Citizen closure and notification loop

**Priority:** P1
**Effort:** Medium
**Outcome:** Citizens can see that a report was received, acted upon, and closed with evidence.

Minimum safe scope:

- Durable acknowledgement and update notifications.
- Closure classification and public resolution summary.
- Evidence-backed resolution where applicable.
- Reopen and appeal/request-review policy.
- Recipient preferences and language.
- No publication of internal notes, assignee identity, or SLA information unless policy later permits it.

### F08 — GeoVideo field-validation workflow

**Priority:** P2
**Effort:** Medium–Large
**Outcome:** GeoVideo becomes an auditable field-validation capability.

Minimum safe scope:

- Capture timestamp and metadata provenance.
- Track quality/accuracy disclosure.
- Before-and-after evidence pairing.
- Project/site association review.
- Explicit per-evidence moderation/publication approval; issue evidence is currently intentionally excluded from the public evidence API.
- Label uploaded coordinates as device-reported unless a separate validation process verifies provenance.
- Duplicate/hash and tamper-indicator checks.
- Reviewer disposition and comments.
- Offline capture queue with resumable upload.
- Retention, access, and storage-cost policy.

### F09 — SMS Connect pilot

**Priority:** P2 after case workflow is stable
**Effort:** Medium plus recurring operating cost
**Outcome:** Citizens without reliable smartphone data receive essential report updates.

Pilot events:

- Report received and ticket number.
- Report acknowledged.
- Additional information requested.
- Report resolved/closed.

Do not send sensitive report descriptions, exact evidence locations, internal notes, or officer identities through SMS.

### F10 — AI knowledge retrieval and governance

**Priority:** P2
**Effort:** Medium
**Outcome:** ANIA provides more consistent, verifiable answers without broadening access.

Minimum safe scope:

- Approved Markdown prompt administration.
- Curated FAQ/knowledge base with pgvector.
- Citations or clear project/source links.
- Evaluation set for accuracy, refusal, scope, and data freshness.
- Replace full-row project lookup in the chatbot tool with an explicit approved public DTO before expanding its scope.
- Administrator-controlled browser/Kokoro/cloud voice settings with server-side secrets.
- Governed saved executive briefs: author, data version, review, approval, supersession, and action register.

### F11 — Type-specific infrastructure monitoring templates

**Priority:** P2
**Effort:** Large and policy-dependent
**Outcome:** Each infrastructure type is assessed using meaningful approved indicators.

Examples requiring stakeholder definitions:

- Irrigation: service area, flow/canal condition, operational turnover evidence.
- Warehouse/cold storage: capacity, operational status, temperature/energy indicators where authoritative.
- Greenhouse: covered area, operational condition, utilization evidence where authoritative.
- Fisheries facilities: type-specific operating and condition indicators.
- Renewable energy: capacity and operational evidence.

Do not invent formulas before the owning BAFE units approve the indicator contracts.

Platform prerequisite: introduce a governed infrastructure taxonomy and source-neutral identity before adding another source. The current ingestion accepts everything except exact normalized FMR records, treats irrigation as INS, and defaults all other records to AMEFIP; overlapping identifiers from another agency cannot safely share the current ABEMIS-specific key model.

### F12 — Forecasting maturity

**Priority:** P3
**Effort:** Medium–Large
**Outcome:** Forecasts become measurable decision support rather than a marketing label.

Minimum safe scope:

- Accumulate reliable snapshots after synchronization is fixed.
- Measure forecast coverage, confidence, and errors.
- Back-test against completed projects.
- Compare with a simple baseline.
- Show insufficient-history states.
- Monitor drift and source changes.
- Keep rules-based risk distinct from statistical projections and any future trained model.

---

## 5. Fix backlog

### P0 — Security and record integrity

1. **Scope and redact audit logs.** Raw issue responses and internal notes are currently written into audit `newValues`, while moderators can view global audit logs. Apply issue scope or restrict sensitive sources to admins, and serialize a safe allowlist.
2. **Centralize issue transitions.** Replace the free status dropdown/API behavior with an authoritative server-side state machine.
3. **Make issue mutations atomic.** Response, status, timestamps, operational event, audit, and notification must commit together or not at all.
4. **Decide issue retention.** Current hard deletion cascades response history and is available to moderators. Establish archive/administrative closure and tightly controlled exceptional deletion before SLA history is introduced.
5. **Validate assignment and routing server-side.** UI hiding is not authorization.
6. **Preserve private boundaries.** Public issue DTOs must continue excluding reporter PII, internal priority, internal notes, assignee identity, SLA data, and precise evidence details where disclosure is not approved.
7. **Resolve the anonymous-reporting contradiction.** The current flow requires authentication and collects a contact number even for “Submit as anonymous,” then discards that number. Either implement abuse-controlled unauthenticated submission without unnecessary contact collection or rename the option accurately.
8. **Stop fabricating missing form values.** Submit `null` for unknown geography instead of `"N/A"`, validate authoritative PSGC identifiers, persist the citizen’s `dateNoticed`, and replace probabilistic `Math.random()` ticket generation with a database-backed unique mechanism.

### P0 — Presentation and data reliability

1. **Resolve or clearly disclose stale synchronization.** Ten consecutive failures have followed the August 11 successful sync.
2. **Persist useful sync diagnostics.** Recent failed rows contain no `errorDetails`, making recovery harder.
3. **Smoke-test the exact demonstration flow.** In today’s local browser check, the project directory initially remained at “0 projects found” and the standalone map remained on “Loading source-backed projects,” although `/api/projects` returned HTTP 200 with a real project. Re-test using the exact browser/account/network to be used tomorrow.
4. **Review test/demo content.** The public evidence API currently contains at least one approved feedback entry whose text is repeated “TEST.” Review moderation state before the presentation. Do not delete or rewrite database records without the required approval and backup safeguards.
5. **Prepare a fallback.** Capture current screenshots or a short local recording of the successful public, dashboard, drill-through, GeoVideo, issue, and AI flows in case the venue network or source services fail.
6. **Do not perform a risky last-minute deployment.** Freeze the demo build after smoke tests, record the commit/build identity, and retain rollback instructions.
7. **Confirm the demo contains the reviewed implementation.** Dashboard redesign, drill-through, security, and notification work currently exists in a large uncommitted working tree; successful local implementation is not evidence that the presentation or production deployment is running that exact revision.

### P1 — Data truthfulness and terminology

1. Replace or explain remaining “budget utilization” copy because no utilization metric exists.
2. Update stale documentation that claims financial disbursement, WMS/GeoServer integration, public export, e-mail notifications, or completed workflow features that the current implementation does not prove.
3. Call `allocated_amount` **Approved/Allocated Budget**.
4. Call ABEMIS `abc` **Supplier Actual Bid Amount** according to the confirmed InfraWatch source contract.
5. Do not claim actual expenditure, disbursement, awarded contract value, or over-budget status until authoritative fields exist.
6. Call schedule warnings **rules-based risk**.
7. Describe statistical completion dates as **evidence-backed projections where sufficient history exists**, not universal AI predictions.
8. Label browser/API refresh, local synchronization, and upstream source time separately.
9. Reconcile documentation that describes InfraWatch as source-neutral or fully multi-agency ready. The current canonical identity, relationships, and single connector are ABEMIS-specific.
10. Protect project identity across upstream corrections: synchronization currently upserts by canonical `abemisId` and does not reconcile a changed canonical ID through stable `abemisRawId`.
11. Move growing public analytics aggregates from an application-memory read capped at 30,001 rows into PostgreSQL before the portfolio can exceed that guard.

### P1 — GIS correctness and performance

1. Remove hard-coded overlay polygons presented as GeoServer layers.
2. Correct the map’s `FMR Watch Projects` attribution.
3. Correct program filtering: current pins carry project type while the standalone map compares that field to `ins` and `amefip`.
4. Align the visible map legend with the marker color classifier.
5. Add a bounded or viewport-based project map query and clustering.
6. Add explicit empty/error/retry states and presentation-time loading diagnostics.
7. Keep all missing-coordinate projects omitted and disclosed.
8. Give search and icon-only map controls accessible names and provide a keyboard/screen-reader-accessible project-result list.

### P1 — Testing and operational readiness

1. Add tests for issue transition rejection and zero-write behavior.
2. Add assignment, policy, cycle, escalation, concurrency, and scheduler tests before SLA launch.
3. Add audit-log authorization/redaction tests.
4. Add export privacy and CSV-injection tests.
5. Add map layer/filter semantic tests and runtime loading checks.
6. Add SMS consent, recipient, retry, opt-out, and sensitive-payload tests.
7. Complete authenticated desktop/tablet/mobile and keyboard QA for dashboard drill-through.
8. Verify every modal project link against a real authorized project.
9. Verify Docker production startup invokes required scheduled services and health checks.
10. Document backup, restore, rollback, and incident recovery procedures.
11. Add e-report form tests for label/input association, native required semantics, `aria-invalid`, and described inline errors.
12. Add public-evidence tests proving that only explicitly moderated issue media can ever cross the public DTO boundary.

---

## 6. What to demonstrate tomorrow

Recommended sequence:

1. **Public homepage** — purpose, source disclosure, and project scope.
2. **Project directory and passport** — search, filters, source details, approved budget, supplier bid, evidence, and unavailable-data labels.
3. **Infrastructure analytics** — lifecycle totals and methodology.
4. **Source-backed GIS map** — disclose mapped-versus-omitted coverage; keep unverified overlay controls off.
5. **Citizen e-reporting** — guided project/location flow and geotagged evidence preparation. Use a prepared non-production demonstration; do not create unwanted production records.
6. **Citizen tracking** — show ticket/status and safe public updates.
7. **Administrative issue handling** — explain that secure assignment/SLA/escalation is the top next phase, not currently complete.
8. **Managerial dashboard** — four KPIs, schedule status, regional/type analysis, data coverage, priority projects, and chart drill-through modal.
9. **ANIA** — ask one controlled project-information question and one portfolio question; explain that it cannot alter project records.
10. **Next-steps slide** — synchronization reliability, assignment/SLA/routing, open data, GIS coverage, SMS pilot, and type-specific indicators.

### Suggested demonstration questions for ANIA

Use questions whose answers can be verified visibly:

- “How many infrastructure projects are in the current synchronized portfolio?”
- “Which fields are unavailable for measuring actual expenditure?”
- For an authenticated manager: “Show the delayed projects represented by this dashboard filter.”

Avoid broad policy, legal, procurement-compliance, or causal questions unless the approved knowledge base supports them.

---

## 7. What not to claim tomorrow

Do not say:

- “The source data is real-time.”
- “InfraWatch measures actual expenditure or budget utilization.”
- “A project is over budget.”
- “AI predicts all project outcomes.”
- “All 25,916 projects are mapped.”
- “GPS evidence cannot be falsified.”
- “Watershed and agricultural-zone GeoServer layers are operational.”
- “Open CSV/JSON export is already available.”
- “SMS Connect is already integrated.”
- “Complaints are automatically routed and escalated.”
- “Official BAFE SLA targets are active.”
- “Every issue transition is currently workflow-enforced.”

Use these instead:

- “The portal uses a synchronized ABEMIS read model and displays its last successful sync.”
- “The dashboard reports approved allocation and supplier actual bid amount; actual expenditure is currently unavailable.”
- “The dashboard provides explainable schedule warnings and bounded evidence-backed projections where sufficient history exists.”
- “The map shows 16,541 coordinate-backed projects and omits 9,375 without valid source coordinates.”
- “GeoVideo and geotagged evidence strengthen field validation and provide reviewable location metadata.”
- “Assignment, SLA, automated routing, open data export, and SMS are prioritized next-phase capabilities.”

---

## 8. Proposed phased roadmap

### Phase A — Stabilize and secure

**Target outcome:** Safe presentation and dependable core operations.

- Restore successful project synchronization.
- Add sync diagnostics, locking, and failure alerts.
- Fix audit-log scope/redaction.
- Enforce transactional issue workflow transitions.
- Decide issue retention and deletion controls.
- Fix GIS layer truthfulness, filters, legend, attribution, and loading performance.
- Complete authenticated drill-through QA.
- Reconcile documentation with the implemented product.

### Phase B — Close the accountability loop

**Target outcome:** Reports become assigned, time-bound, auditable work.

- Assignment and self-claim.
- Approved SLA policy administration.
- Acknowledgement and resolution cycles.
- Escalation and operational queues.
- Reporter notifications and closure evidence.
- Watchlists and intervention register.

### Phase C — Expand transparency and inclusion

**Target outcome:** Public data is reusable and low-bandwidth users are included.

- CSV/JSON export and data dictionary.
- Coordinate-quality workbench and authentic GIS layers.
- SMS acknowledgement/status pilot.
- Offline/resumable GeoVideo and e-report uploads.
- Public change history where source evidence supports it.

### Phase D — Mature intelligence and specialization

**Target outcome:** More defensible forecasting and type-specific monitoring.

- Forecast back-testing and confidence monitoring.
- Approved project-type indicator templates.
- Curated AI FAQ/knowledge retrieval and citations.
- Governed executive briefs and management action tracking.
- Evaluate predictive models only after sufficient reliable history exists.

---

## 9. Decisions needed from management

1. Approve the official issue priorities and definitions.
2. Approve acknowledgement and resolution SLA targets.
3. Decide calendar-time versus business-hours rules, holidays, and timezone.
4. Confirm authorized assignment dimensions: individual, office, region, program, or combinations.
5. Approve issue retention, archival, and exceptional deletion policy.
6. Approve which issue/SLA information, if any, may become public.
7. Identify the authoritative expenditure, disbursement, awarded-value, and actual-cost fields—or confirm that they remain unavailable.
8. Approve the GeoServer layers and custodians that InfraWatch may display.
9. Approve public export fields, license, data dictionary, limits, and update cadence.
10. Approve SMS provider/procurement, budget, sender identity, consent, templates, and operating owner.
11. Approve type-specific monitoring indicators with each owning technical unit.
12. Assign operational owners for sync failures, data-quality findings, citizen cases, and AI content governance.

---

## 10. Technical evidence references

- Dashboard metric and truthfulness contract: `docs/dashboard-kpi-definitions.md`
- Managerial analytics query: `lib/analytics/managerial-dashboard-query.ts`
- Drill-through endpoint: `app/api/admin/analytics/drillthrough/route.ts`
- Dashboard client: `components/admin/dashboard/managerial-dashboard-client.tsx`
- Project source client: `lib/abemis/client.ts`
- Project synchronization: `lib/abemis/sync.ts`
- Project directory query: `actions/query/public-projects.query.ts`
- Standalone GIS page: `app/(public)/map/page.tsx`
- GIS canvas and current overlay implementation: `components/map/gis-map-canvas.tsx`
- Source-backed coordinate filter: `lib/public-project-map.ts`
- GeoVideo plan and contract: `docs/geovideo-integration-plan.md`
- GeoVideo parsing: `lib/geo-video-parser.ts`
- Geotagged evidence upload: `components/shared/geo-evidence-upload.tsx`
- Citizen issue endpoint: `app/api/issues/route.ts`
- Admin issue response mutation: `app/api/admin/issues/[id]/responses/route.ts`
- Admin issue queue: `components/admin/issues/issue-management-view.tsx`
- SLA implementation plan: `.hermes/plans/2026-08-24_141743-issue-assignment-sla-escalation.md`
- Notification persistence and recipient scope: `lib/notification-persistence.ts`, `app/api/notifications/route.ts`, and `app/api/notifications/stream/route.ts`
- Audit query: `actions/query/audit-logs.query.ts`
- Permissions: `lib/permissions.ts`
- Scheduler: `lib/scheduler.ts`

---

## 11. Final recommended next-steps slide

### Already working

- Unified synchronized project repository
- Public project transparency portal
- Infrastructure analytics and managerial dashboard
- Protected chart drill-through
- Source-backed project and evidence maps
- GeoVideo/geotagged issue evidence
- Citizen e-reporting and tracking
- AI-assisted project information
- Moderation, notifications, data quality, sync logs, and user administration

### Build next

1. Restore reliable data synchronization.
2. Secure audit logs and issue history.
3. Complete assignment, SLA, escalation, and automated routing.
4. Release safe CSV/JSON open-data export.
5. Fix and scale GIS layers and coordinate coverage.
6. Add operations queues and project intervention watchlists.
7. Complete citizen closure notifications.
8. Pilot SMS Connect.
9. Mature GeoVideo field validation and offline capture.
10. Add approved type-specific monitoring indicators.
11. Mature forecast validation and governed AI knowledge.

### Guiding principle

> **Truthful data, source-backed evidence, secure accountability, and inclusive public access before additional decorative or speculative features.**
