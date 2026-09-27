# INFRA Watch code, security, and UI review

Date: 2026-09-27. Scope: **`infra-watch` only**, including its current uncommitted changes. This report supersedes the earlier, incorrectly scoped FMR Watch review for this request. No application fixes have been applied.

## Findings summary

These counts cover the four security findings below, not every dependency advisory or UI issue.

| Severity | Security findings |
| --- | ---: |
| Critical | 0 confirmed application exploits |
| High | 2 |
| Medium | 2 |
| Low | 0 |

There are also two functional findings and a separate [numbered UI audit](../../anti-slop/audit-002-2026-09-27.md). The dependency scan includes upstream critical advisories; their deployment conditions are described under S2.

## Security findings

### S1. High: regional admins bypass region restrictions through Better Auth endpoints

Confidence: **High**. Reproduced with synthetic accounts and the installed Better Auth package in an isolated memory adapter. No live accounts, database, network requests, or email were used.

Locations: `lib/permissions.ts:83`, `lib/auth.ts:127`, `app/api/auth/[...all]/route.ts:7`, `actions/query/users.query.ts:118`, `actions/mutation/users.mutation.ts:21`.

The application grants regional admins `user: ["list", "read", "update", "ban", "revoke"]`. Custom actions enforce a region check, but the catch-all authentication route forwards requests directly to the plugin:

```ts
export const GET = handlers.GET;
// POST also delegates straight to handlers.POST(request).
```

The plugin checks the role's grants, without the application's region predicate. A regional admin can call `/api/auth/admin/list-users` directly and send a different region's user ID to `/api/auth/admin/ban-user`.

The isolated probe returned HTTP 200 for both operations, exposed the outside-region synthetic account, and set that account's `banned` field to true. Local dependency version was Better Auth 1.6.27; the Docker lockfile specifies 1.6.26. The application's missing boundary restriction is present independently of that patch-version drift.

Impact: disclosure of accounts outside the assigned region and unauthorized account changes or lockouts. No claim is made that a citizen can invoke these privileged operations.

Fix: enforce the same scope at the plugin HTTP boundary or restrict its administrative HTTP endpoints to full admins and retain scoped server actions for regional admins. Add integration coverage for direct GET and POST requests, not only the UI actions. Preserve the existing deliberate policy that regional admins have global project access; this finding concerns region-scoped **user management**.

### S2. High: runtime dependencies include published critical advisories

Confidence: **High for affected versions; deployment-dependent exploitability**.

Locations: `package.json:26`, `package.json:62`, `package.json:80`, `next.config.ts:20`, `Dockerfile:3`, `Dockerfile:8`.

Both the manifest and installed modules have Next.js **16.2.11** and Sharp **0.35.3**. The Sharp override pins the affected version, so updating only a transitive dependency is insufficient.

- The Next.js maintainer identifies Windows-hosted servers without Cache Components as affected by an unauthenticated RCE, fixed in 16.3.3. This applies conditionally to a reachable Windows server; the checked-in Linux Docker deployment is outside that Windows-specific condition. [Maintainer advisory](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36)
- Next.js also identifies RCE during AVIF image optimization and disables that processing in patched versions. This app enables the optimizer and allows remote image sources. Its media upload validator rejecting AVIF does not cover all allowed upstream image sources. Exploitation still requires a malicious image reaching the decoder. [Maintainer advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4)
- Sharp fixes the affected libheif dependency in **0.35.4**. Its advisory describes possible RCE under particular glibc Linux runtime conditions; this review did not determine the deployed runtime's full mitigation state or attempt exploitation. [Maintainer advisory](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c)

Fix: upgrade Next.js and its ESLint configuration to at least 16.3.3, and both Sharp declarations to at least 0.35.4. Regenerate and verify `bun.lock`, then build and test the actual deployment image.

`bun audit --json` reports **32 advisories across 14 packages: 3 critical, 14 high, 15 moderate**. These are lockfile results, including transitive and development packages, not 32 demonstrated attack paths. For example, locked `protobufjs` is 6.11.6 while the local top-level installation is 7.6.5. Docker uses `bun install --frozen-lockfile`, so a clean local installation is not evidence that the deployed dependency graph is clean. Do not force incompatible major versions merely to silence audit results.

### S3. Medium: invalid public API limits disable pagination

Confidence: **High**, verified with the installed Drizzle query builder without executing database queries.

Location: `app/api/projects/route.ts:46`.

```ts
const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? 10), 25);
```

`?limit=-1` and `?limit=NaN` produce values that cause Drizzle to omit `LIMIT` entirely. The no-search branch then selects all matching projects in the year scope. Repeated anonymous requests can cause unnecessarily large queries, responses, and memory use. Fractional limits also reach PostgreSQL rather than being rejected as invalid input.

Probe: `10` generated `select "id" from "projects" limit $1`; `-1` and `NaN` generated `select "id" from "projects"`.

Fix: validate a finite integer in the range 1–25 before building queries and return HTTP 400 otherwise. Also cap the search string length and number of tokens because each token adds multiple SQL predicates. Test missing, negative, nonnumeric, fractional, zero, and oversized limits.

### S4. Medium: the KML proxy trusts imported URLs for server-side fetching

Confidence: **High for the missing boundary; Medium for exploitability**.

Locations: `app/api/kml-proxy/route.ts:69`, `lib/abemis/transform.ts:164`.

Imported `kmllink` metadata reaches `fetch(kmlUrl)` without a scheme/host allowlist or redirect restriction. The response is then fully buffered with `.text()`. An upstream malicious or compromised metadata entry, or an allowed source redirecting to an internal service, can make the public proxy request an internal HTTP endpoint and return its response.

This is a **conditional SSRF**, not an endpoint that accepts an arbitrary URL from an anonymous caller: callers supply a project identifier, and the URL comes from stored ABEMIS data. Public metadata serialization already has a source-host validator, but the proxy reads raw database metadata and bypasses it.

Fix: validate HTTPS and approved source hosts at this fetch boundary, reject credentials and unexpected ports, disable automatic redirects or validate every redirect target, and cap response bytes while streaming. Retain the existing timeout. Use egress restrictions to prevent private-network targets as defense in depth.

## Functional findings

### B1. High: production verification and recovery emails are never sent

Confidence: **High**.

Locations: `lib/auth.ts:66`, `lib/auth.ts:138`, `lib/auth.ts:144`, `lib/email.ts:23`.

Password accounts require verified email. The OTP delivery callback only calls `console.info` outside production and does nothing in production. Signup verification, emailed sign-in codes, resends, and OTP password recovery cannot deliver their codes even when SMTP is configured. The existing `sendEmail` helper is used for other notifications but is not connected to authentication.

Fix: deliver OTPs through the mail helper, propagate delivery failure, and test signup, resend, sign-in, and recovery under production configuration with a captured test mail transport. Keep OTP values out of production logs.

### B2. Medium: regional admins are granted features that hard-coded role checks reject

Confidence: **High**.

Locations: `app/api/upload/preview/access.ts:24`, `app/api/knowledge-base/upload/route.ts:33`, `lib/permissions.ts:67`.

Regional admins have issue-read and knowledge-base-create grants. However, issue evidence previews allow only the owner, an admin, or a moderator. A regional admin reading somebody else's issue receives 403. The knowledge-base upload endpoint separately admits only admin and moderator roles. The isolated preview probe returned `false` for a regional admin, even with an allowed scope callback.

Fix: centralize role capabilities and apply the intended object scope after the capability check. Cover regional admins in the preview and upload route tests. Do not broaden all admin-only routes indiscriminately.

## Code quality and verification

| Check | Result |
| --- | --- |
| TypeScript, `tsc --noEmit --incremental false` | Passed |
| Node tests, 150 files under app/actions/components/hooks/lib/scripts | 692 tests: 688 passed, 3 failed, 1 skipped |
| Province geometry tests, separate Bun invocation | 3 passed |
| ESLint | 5 errors, 6 warnings |
| Documented `bun test`, local Bun 1.3.11 | Failed with runner compatibility errors; not equivalent to 153 application bugs |
| `git diff --check` on existing changes | Extra blank lines at EOF in two existing test-file changes |
| Browser interaction / screenshots | Not performed: no browser available in the configured browser session |
| Production build and deployed-service checks | Not performed |

Node test failures:

1. `app/ai-assistant-placement.test.ts` expects a unified ARIA name, while the component uses ANIA/InfraWatch AI in some places and ARIA in others. Reconcile the intended identity and update both the UI and its test.
2. `lib/analytics/managerial-dashboard-query.test.ts:122` expects only the year parameters, but the query now adds status-exclusion parameters. The null/blank SQL assertions pass. This is an outdated exact-parameter assertion, not proof that Unknown filters return incorrect results.
3. `lib/voice/audio-worklet-contract.test.ts:58` deep-compares an array created in a VM realm with an array in the host realm. Earlier audio content and copying assertions pass. Compare the transfer list's length and the actual buffer reference; this failure does not establish an audio-processing defect.

Lint errors: three explicit `any` annotations in `app/api/submission-survey/route.test.ts:92`, `:112`, and `:147`; synchronous effect state updates in `components/feedback-feed/feedback-feed-client.tsx:55` and `components/feedback-feed/post-options-menu.tsx:57`. Resolve the state ownership rather than suppressing the rules globally.

The deployment guide says `bun test`, while most tests import `node:test`; the local Bun runner fails on this suite. Add one supported test command to `package.json` and CI, and run against a reproducible frozen dependency install. The local and Docker Bun versions also differ (1.3.11 versus 1.3.14).

Positive findings in the inspected paths: strict TypeScript is enabled; public issue DTOs exclude reporter PII and private evidence; chat history is owned by the server; public KB search has a visibility predicate; private evidence responses use `private, no-store`; production auth requires an explicit secret; tracked environment files are examples. These observations are not a blanket security certification or a historical secret scan.

## Proposed patches for high-priority findings

Review each patch before applying. Nothing in the application has been changed yet. These are proposals, not validated fixes.

### S1: restrict direct plugin administration while retaining scoped server actions

In `app/api/auth/[...all]/route.ts`, replace the direct GET export and add the same guard before POST delegation:

```diff
-export const GET = handlers.GET;
+async function guardPluginAdministration(request: Request) {
+  const path = new URL(request.url).pathname.replace(/\/+$/, "");
+  if (!path.startsWith("/api/auth/admin/")) return null;
+  if (path === "/api/auth/admin/has-permission") return null;
+
+  // Scoped application actions must not be bypassed through plugin HTTP routes.
+  const session = await auth.api.getSession({ headers: request.headers });
+  if (!session?.user) {
+    return Response.json({ error: "Authentication required." }, { status: 401 });
+  }
+  if (session.user.role !== "admin") {
+    return Response.json({ error: "Use scoped user management." }, { status: 403 });
+  }
+  return null;
+}
+
+export async function GET(request: Request) {
+  const rejection = await guardPluginAdministration(request);
+  return rejection ?? handlers.GET(request);
+}

 export async function POST(request: Request) {
+  const rejection = await guardPluginAdministration(request);
+  if (rejection) return rejection;
   const requestForAudit = request.clone();
```

This proposal applies to the existing `/api/auth` mount and blocks direct plugin administration for non-admins. Server-side `auth.api` calls from already scoped actions do not pass through this Next.js HTTP wrapper. Verify all intentional admin-client usage, direct endpoint variants, and impersonation flows before adopting this containment approach. A shared plugin-level scope policy is preferable if regional admins must use the plugin HTTP APIs directly.

### S2: update the direct runtime pins

```diff
 // package.json, overrides
-"sharp": "0.35.3",
+"sharp": "0.35.4",
 // package.json, dependencies
-"next": "16.2.11",
+"next": "16.3.3",
-"sharp": "0.35.3",
+"sharp": "0.35.4",
 // package.json, devDependencies
-"eslint-config-next": "16.2.11",
+"eslint-config-next": "16.3.3",
```

The comments identify separate JSON locations and are not literal JSON additions. These versions are verified patched minimums, not a claim about the latest releases. Update the lockfile and validate framework changes before deployment.

### B1: send authentication codes and reject silent mail failures

```diff
 // lib/auth.ts imports
+import { sendEmail } from "@/lib/email";
 // Inside emailOTP configuration
       async sendVerificationOTP({ email, otp, type }) {
         if (process.env.NODE_ENV !== "production") {
           console.info(`[INFRA Watch OTP] ${type} code for ${email}: ${otp}`);
+          return;
         }
+        // Verification must fail visibly if its code cannot be delivered.
+        const result = await sendEmail({
+          to: email,
+          subject: "Your INFRA Watch verification code",
+          text: `Your verification code is ${otp}. If you did not request it, ignore this email.`,
+        });
+        if (!result.success) {
+          throw new Error("Verification email could not be sent.");
+        }
       },
```

Configure and test the sender identity and transport; do not treat a callback returning successfully as proof that a message reached the recipient.

## Recommended order

1. Close S1 and upgrade the affected runtime dependencies in S2.
2. Connect OTP delivery, validate API limits, and align regional-role checks.
3. Harden the KML fetch boundary.
4. Fix the keyboard, mobile, inert-control, and contrast findings in the UI audit before polishing the visuals.
5. Stabilize the test runner and dependency installation, then verify desktop, phone, dark mode, reduced motion, and role-specific flows in a browser.
