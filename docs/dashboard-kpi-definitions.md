# Managerial Dashboard KPI Definitions

**Version:** 1.0 (managerial v1 implementation baseline)
**Approved baseline:** 2026-08-09, via approval to execute the Infrastructure Analytics Managerial Dashboard plan
**Reporting timezone:** Asia/Manila
**Owners for final source-contract confirmation:** InfraWatch product owner and ABEMIS data owner

## Purpose and decision scope

The Infrastructure Analytics Dashboard supports authorized managers who need to assess portfolio delivery, compare programs and locations, and identify projects requiring intervention. Every metric is calculated from projects visible to the signed-in user after server-side authorization scope and validated dashboard filters are applied.

The dashboard is a managerial view of the local ABEMIS read model. Browser refreshes do not make ABEMIS real-time. The UI labels ingestion currency as **Last successful sync …** and exposes freshness and coverage; it must not call that local timestamp the upstream source's “Data as of” time.

## Shared rules

- One `asOf` instant is used for every widget in a response and interpreted using Asia/Manila calendar boundaries.
- Moderator region and assigned-program scope is always added server-side. Client filters may narrow but never widen that scope.
- Blank and `all` filters mean no additional filter. Unknown values remain an explicit **Unknown** category.
- Monetary values are Philippine pesos. Store/query full precision; display currency with locale-aware rounding.
- A database zero is a known zero. A null is missing and is counted separately in coverage.
- No live analytics path may return demo, reference, or plausible fallback figures.
- Completion uses the existing canonical status mapping. Null/unrecognized states remain assessable only according to that shared mapping and must not be silently dropped.

## KPI contract

| Label | Managerial question | Formula and denominator | Source | Null/invalid handling | Filters and scope | v1 status |
|---|---|---|---|---|---|---|
| Projects monitored | How large is the visible portfolio? | Count of scoped, filtered `projects` rows | `projects.id` | Every scoped row counts once | All global filters and server scope | Ready |
| Allocated budget | What allocation is represented? | Sum of non-null `projects.budget` | ABEMIS `allocated_amount` → `projects.budget` | Null excluded from sum and reported in coverage; zero retained | Same condition set as project count | Ready |
| Approved Budget for Contract (ABC) | What procurement ceiling is represented? | Sum of non-null `projects.abc` | ABEMIS `abc` → `projects.abc` | Null excluded and reported in coverage; zero retained | Same condition set as project count | Ready; label exactly as ABC |
| Completion rate | What proportion of the assessed portfolio is complete? | Canonically completed / all status-assessed scoped projects × 100 | `projects.status`, shared canonical status mapping | Zero denominator returns 0; raw variants map through one tested classifier | Same condition set as project count | Ready; baseline denominator is all canonically assessed projects |
| Delayed projects | Which incomplete projects have passed target? | Count where project is incomplete and target date is before `asOf` | `status`, `targetCompletionDate` | Missing/invalid target is not assessed, not delayed | Same condition set plus optional schedule-health filter | Ready, show schedule coverage |
| At-risk projects | Which active projects show explainable schedule risk? | Count classified at risk by rules below | dates + physical progress | Missing/untrusted inputs are not assessed | Same condition set plus optional schedule-health filter | Ready as rules-based outlook |
| Budget exposure | How much allocation is attached to delayed/at-risk work? | Sum of non-null allocated budget for selected health classes | `projects.budget` + schedule-health result | Missing budget excluded from sum and shown in coverage | Same scope and filters | Ready |
| Expenditure | How much has actually been spent/disbursed? | Authoritative disbursed amount | No confirmed field | Unavailable; never infer | N/A | **Blocked** |
| Financial utilization | What share of allocation is actually disbursed? | Actual disbursement / allocation × 100 | No confirmed disbursement field | Unavailable | N/A | **Blocked** |
| Awarded contract value | What value was actually awarded? | Sum of authoritative award amount | No confirmed field | Unavailable | N/A | **Blocked** |

## Monetary semantics

These labels are not interchangeable:

- `projects.budget` is **Allocated budget**, sourced from ABEMIS `allocated_amount`.
- `projects.abc` is **Approved Budget for Contract (ABC)**, a procurement ceiling.
- `projects.contractAmount` currently duplicates ABEMIS `abc` in `transformAbemisProject()`. It must not be displayed as awarded contract value.
- No authoritative actual expenditure/disbursement amount is currently mapped.

The v1 section is therefore named **Budget Oversight** and may show allocated budget, ABC, and their variance. It must not use “spent,” “disbursed,” “expenditure,” “actual contract value,” or “utilization.”

## Progress semantics

- `physicalProgress` is inferred from the sum of ABEMIS POW `actual` values and clamped to 0–100 by the current transformer.
- `financialProgress` is inferred from the sum of ABEMIS POW `target` values. Its financial meaning is unconfirmed, so v1 must not label it disbursement, expenditure, or financial utilization.
- Because the schema currently defaults progress to zero, the dashboard separately requires valid POW-row evidence before treating `physicalProgress` as reported. A reported zero remains assessable; missing, null, or blank POW values are not assessed.

## Rules-based schedule health

Thresholds are shared constants:

- schedule deficit: **15 percentage points**
- due-soon horizon: **30 days**
- due-soon physical-progress threshold: **80%**
- regional bottleneck minimum: **5 assessable projects**

Classification order:

1. **Completed late (historical only):** completed project with actual completion after target. It is not an active delayed item.
2. **Delayed:** incomplete project with target completion date before `asOf`.
3. **Not assessed:** missing/invalid start or target, nonpositive duration, future start, missing/untrusted progress, or inactive/non-comparable state.
4. **At risk:** active, assessable, not delayed, and either expected progress minus physical progress is at least 15 points, or target is within 30 days and physical progress is below 80%.
5. **On track:** active and assessable but neither delayed nor at risk.

Expected progress is elapsed schedule duration / total schedule duration × 100, clamped to 0–100 after dates are validated. The UI must expose a textual reason and make this rule available in help text.

## Coverage contract

Each response reports:

- total scoped projects;
- projects with non-null allocated budget;
- projects with non-null Approved Budget for Contract;
- projects with valid schedule dates;
- projects with trusted physical-progress evidence to the extent current source fields permit;
- projects with validated financial data (zero in v1 until source confirmation).

Rates and risk statements show assessed counts or coverage where missing data can materially change interpretation.

## Freshness contract

- `lastSuccessfulSyncAt`: completion timestamp of the latest successful project sync, falling back to latest project source timestamp only when explicitly identified as such.
- `latestSyncStatus`: latest project sync status.
- **Fresh:** latest successful sync is no more than **26 hours** old.
- **Stale:** latest successful sync is more than 26 hours old.
- **Failed:** latest attempt failed; retain and label the last successful sync timestamp.
- **Never synced:** no successful sync timestamp exists.

The 26-hour threshold reflects the documented nightly 02:00 Asia/Manila schedule and provides a two-hour tolerance.

## Filter contract

Supported filters are program, funding year, region, province, project type, canonical/raw project status as exposed by scoped options, and schedule health. Values are trimmed and length-limited; funding year is either a bounded four-digit year or the explicit `Unknown` sentinel. Every `Unknown` dimension filter maps to null-or-blank database values. Province is a narrowing filter only and is never trusted as authorization scope. Changing region clears province in the client. Malformed shared URLs show an explicit error and never widen to an unfiltered portfolio.

## Data-quality and security requirements

- Aggregates, filter options, chart series, priority rows, and detail links use the same server-derived scope.
- API errors are generic and never expose SQL, credentials, stack traces, or internal configuration.
- The response excludes citizen reporter/contact data, account data, audit details, ABEMIS credentials, and unnecessary project text.
- Priority rows are bounded to 10 and progress-variance samples are bounded.

## Deferred decisions

The following require authoritative ABEMIS confirmation before labels or calculations change:

1. actual expenditure/disbursement field, if any;
2. awarded contract amount distinct from ABC;
3. exact POW `target` and `actual` semantics and whether missingness can be preserved;
4. whether completion-rate denominator should later be narrowed to started or target-dated projects;
5. whether schedule-risk thresholds vary by project type.

Until confirmed, v1 uses the safe definitions above and displays unavailable states rather than inferred financial claims.
