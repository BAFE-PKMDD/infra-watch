# Proposed Audience Activity and Demographic Analytics

**Status:** Proposed — not implemented in the current repository.

**Recommended module name:** **Audience Activity and Demographic Analytics**
**Short navigation label:** **Audience Analytics**

This design answers two different questions without pretending they are the same:

1. **Activity:** What do visitors do in InfraWatch?
2. **Demographics:** What optional characteristics did consenting participants report about themselves?

Activity never proves age, gender, occupation, or identity. Demographics must not be inferred from activity, name, email, mobile number, image, IP address, location, writing style, device, or AI classification.

## 1. Current-state finding

The current repository has:

- Project portfolio analytics
- Project trend snapshots
- Issue and feedback SLA analytics
- Feedback and user-account totals
- Audit/security event records

It does **not** have:

- A general web-analytics event table
- Page-view or download event instrumentation
- An analytics-consent record
- A visitor identifier designed for product analytics
- Age, age-band, gender, audience-type, or demographic fields
- Visitor/download demographic dashboards

The `audit_logs`, Better Auth session IP/user-agent fields, chat rate limits, and application logs are not approved substitutes for audience analytics.

## 2. Questions the module may answer

### Activity questions

- How many page views occurred?
- How many consenting unique visitors used the site?
- Which project pages were viewed most?
- Which filters were used most?
- Which files/reports were successfully downloaded?
- What percentage of visitors started and completed an E-Report or feedback submission?
- Which map/project/content areas have the most engagement?
- How many visits are new versus returning, if the user consented to a persistent analytics identifier?

### Demographic questions

Among people who voluntarily answered:

- What age bands are represented?
- What gender categories are represented?
- Which regions are represented?
- What types of audience use InfraWatch (farmer, cooperative, LGU, researcher, general public, and so on)?
- How do aggregate activity patterns differ across sufficiently large demographic groups?

Every demographic report must clearly show response coverage, for example:

```text
Unique downloaders:                   930
Downloaders who answered survey:      630 (67.7%)
Not provided / anonymous:             300 (32.3%)
```

Never describe the 630 respondents as if they represented all 930 downloaders.

## 3. Recommended collection model

Use three explicit modes.

### Mode A — Essential aggregate activity

Can operate without a persistent visitor identifier:

- Total page views
- Total successful downloads
- Total project searches/filter applications
- Total form starts/submissions
- Aggregate route/resource counts

This mode cannot reliably calculate unique or returning visitors.

### Mode B — Consented pseudonymous activity

After analytics consent, issue a random first-party visitor ID:

- Random, non-semantic value
- Stored in a first-party secure/same-site cookie where possible
- Rotated on a defined schedule
- Not derived from IP, user agent, fingerprint, email, or phone
- Deletable when consent is withdrawn

This mode supports unique/returning visitor and funnel analysis without naming the visitor.

### Mode C — Optional demographic participation

A signed-in user or survey participant may separately provide optional demographic answers and consent to their aggregated use. Skipping must not block access, reports, downloads, E-Reports, or feedback.

Recommended collection points:

1. Optional profile section for registered users
2. Optional survey after a successful download
3. Optional, infrequent audience survey
4. Optional section after feedback/E-Report completion, clearly separated from case processing

Do not ask demographic questions before allowing a download or submission.

## 4. Proposed activity event taxonomy

Use controlled event names and bounded properties. Do not send arbitrary DOM text, free-text search queries, report descriptions, feedback, contact details, or message content.

| Event | Trigger | Safe properties | Do not collect |
| --- | --- | --- | --- |
| `page_viewed` | Public route rendered | route template, language, referrer category | Full URL containing sensitive query values |
| `project_searched` | Search submitted | result-count band | Raw free-text query by default |
| `project_filters_applied` | Filter state applied | program/status/year/region codes | User-written text |
| `project_viewed` | Project record opened | stable project ID, source freshness band | User identity unless consented/auth-required |
| `map_viewed` | Map initialized | active filter codes | Device fingerprint |
| `map_project_opened` | Marker/detail opened | stable project ID | Approximate inferred home location |
| `document_download_completed` | Server confirms delivery action | resource ID/type, project ID if applicable | Original file path containing secrets/PII |
| `live_content_viewed` | Live/recorded item opened | stable content ID/type | Third-party tracking IDs copied into analytics |
| `feedback_started` | User begins feedback workflow | entry surface | Comment text |
| `feedback_submitted` | Server creates feedback | category, has-media boolean | Comment, media URL, public-anonymous identity |
| `report_started` | User begins E-Report | entry surface | Reporter/contact fields |
| `report_submitted` | Server creates E-Report | category, project-linked boolean, has-evidence boolean | Description, location precision, contact details |
| `issue_status_viewed` | Owner/public opens status detail | public status, ownership mode | Ticket plus contact identity in one event |
| `analytics_consent_changed` | Visitor accepts/withdraws | consent version and state | IP/user-agent copy |
| `demographic_survey_submitted` | Optional survey saved | response-set version, completion only | Answers in the general event payload |

### Search analytics

Raw search text can contain names, phone numbers, complaint details, or other personal data. Prefer:

- Controlled filter values
- Number of search attempts
- Result-count bands (`0`, `1–10`, `11–50`, `51+`)
- A separately reviewed, redacted keyword pipeline only if a real operational need is approved

## 5. Measuring downloads correctly

A button click is not the same as a successful download.

Recommended flow:

```text
Visitor selects Download
  → GET /api/downloads/[resourceId]
  → server resolves stable approved resource
  → authorize if private
  → verify object exists
  → create/stream download response
  → record document_download_completed for successful handoff
  → return file
```

Use a stable resource ID, not a client-provided arbitrary URL. Distinguish:

- Total download attempts
- Successful download handoffs
- Unique consenting downloaders
- Resource/document type
- Project/report context

Browser/network cancellation after streaming begins cannot always be proven as a fully saved file; label the metric according to what the server can actually confirm.

## 6. Proposed demographic questions

Collect the smallest set that answers an approved service question.

### 6.1 Age

Ask for an optional **age range**, not exact birth date:

```text
Age range (optional)
- 18–24
- 25–34
- 35–44
- 45–54
- 55–64
- 65 and above
- Prefer not to say
```

If collecting responses from people under 18 is required, complete a separate child/minor privacy review before adding an `Under 18` option. Do not derive age from account creation date, content, name, photo, or activity.

### 6.2 Gender

Use optional self-description approved by BAFE privacy/governance owners. A minimal starting set may be:

```text
Gender (optional)
- Female
- Male
- Prefer to self-describe
- Prefer not to say
```

If free-text self-description is allowed, do not include that text in routine dashboards. Consider a controlled category or aggregate it as `Self-described`.

### 6.3 Audience type

Often more actionable than age/gender:

```text
Which best describes your use of InfraWatch? (optional)
- Farmer or agricultural stakeholder
- Farmers’ cooperative or association
- LGU personnel
- National government personnel
- Contractor or supplier
- Researcher or student
- Civil-society organization
- General public
- Other
- Prefer not to say
```

### 6.4 General location

Use region and, only if justified, province/municipality. Do not request exact address for audience analytics. Do not reuse precise E-Report evidence location as a visitor demographic.

## 7. Proposed consent wording

Example—not a substitute for Data Protection Officer/legal approval:

> Help BAFE understand how InfraWatch is used. Your answers are optional. They will be used only for aggregated service-improvement reports and will not affect access to projects, downloads, feedback, or E-Report processing. Do not provide information you do not want included. You may choose “Prefer not to say” or skip this survey.

Consent must be:

- Separate from Terms of Service
- Specific to activity analytics and/or demographic reporting
- Versioned and timestamped
- Withdrawable
- Reflected in collection behavior after withdrawal
- Accompanied by purpose, retention, access, and deletion information

## 8. Proposed data model

Names are illustrative and require migration review.

### `analytics_events`

| Field | Purpose |
| --- | --- |
| `id` | Event UUID |
| `event_name` | Allowlisted event name |
| `occurred_at` | Server timestamp |
| `visitor_key` | Nullable rotating pseudonymous key |
| `user_id` | Nullable authenticated user reference; include only under approved basis |
| `session_key` | Nullable bounded session key |
| `route_template` | Normalized route, not arbitrary full URL |
| `resource_type` / `resource_id` | Stable project/report/document reference |
| `properties` | Allowlisted bounded JSON; no free text/PII |
| `consent_version` | Consent version used for non-essential analytics |

### `analytics_consents`

| Field | Purpose |
| --- | --- |
| `subject_key` | User ID or pseudonymous visitor key |
| `activity_analytics` | Accepted/declined state |
| `demographic_analytics` | Accepted/declined state |
| `notice_version` | Exact notice version |
| `granted_at` | Consent time |
| `withdrawn_at` | Withdrawal time |

### `demographic_responses`

| Field | Purpose |
| --- | --- |
| `id` | Response UUID |
| `subject_key` | Separate controlled link to consented user/visitor |
| `age_band` | Controlled optional value |
| `gender` | Controlled optional value |
| `audience_type` | Controlled optional value |
| `region_code` | Optional general region |
| `response_version` | Survey schema version |
| `consented_at` | Demographic consent timestamp |
| `expires_at` | Retention expiry |

Keep demographic answers out of the general event payload. Restrict the ability to join activity and demographics.

### Aggregated reporting tables

For routine dashboards, build daily aggregates such as:

- date + event + route/resource
- date + age band + event
- date + gender + event
- date + audience type + event

Delete or de-identify raw events on the approved schedule while retaining only safe aggregates.

## 9. Access and reporting rules

Recommended rules:

- Only administrators with a dedicated analytics-demographics permission can access demographic reports.
- Moderators should not see individual demographic responses.
- No dashboard should expose individual-event timelines combined with age/gender/location.
- Suppress or combine groups smaller than an approved threshold; recommended starting threshold: fewer than 5 respondents.
- Use `Not provided` as a real reporting category.
- Show survey response rate and consent coverage on every demographic chart.
- Downloads/exports containing demographic breakdowns require authorization and audit logging.
- Do not allow arbitrary query combinations that can isolate one person.

## 10. Recommended dashboard

### Audience Overview

- Total page views
- Consented unique visitors
- New/returning consenting visitors
- Total successful downloads
- Survey response and consent coverage

### Activity and Engagement

- Most viewed project records
- Project search/filter use
- Map/project-marker engagement
- Most downloaded documents
- E-Report start-to-submit rate
- Feedback start-to-submit rate

### Demographic Overview

- Age-band distribution
- Gender distribution
- Audience-type distribution
- Region distribution
- `Not provided` count and rate

### Cross-tab reports

Only for cohorts above the suppression threshold:

- Successful downloads by age band
- Project views by audience type
- E-Report completion by age band
- Most viewed project types by region
- Downloaded document types by gender

Use neutral labels. Do not imply causation from correlation.

## 11. Data-quality and anti-abuse handling

- Exclude known staff/internal test traffic through explicit environment/account flags, not covert fingerprinting.
- Detect bots using bounded request behavior and trusted infrastructure signals; report bot-filtering methodology.
- Use server events for submissions/download handoffs and client events for presentation interactions.
- Deduplicate retries with event IDs/idempotency keys.
- Validate resource IDs server-side.
- Do not let analytics failure block project access, downloads, feedback, or E-Reports.
- Monitor event loss and schema-version mismatch.

## 12. Privacy threat analysis

### Re-identification

Age band + gender + municipality + project + exact timestamp may identify a person, especially in a small community.

Controls:

- Prefer region over municipality.
- Round time to day/week in reports.
- Suppress small cohorts.
- Avoid individual drillthrough.
- Separate demographic storage and permissions.

### Purpose expansion

Data collected for service improvement could later be reused for profiling.

Controls:

- Document approved purposes.
- Prevent ad targeting, eligibility decisions, complaint prioritization, or enforcement use.
- Require a new review/consent for materially different purposes.

### Anonymous-report linkage

Joining anonymous E-Report activity with demographic/profile data can defeat the user's expectation of anonymity.

Controls:

- Do not attach demographic responses to individual grievance/feedback records.
- Report only aggregate cohorts.
- Keep case-processing access separate from demographic-analytics access.

### Identifier misuse

IP/user-agent hashes can remain personal or linkable data.

Controls:

- Do not use raw or hashed IP/user-agent as the audience identifier.
- Use random first-party IDs after consent.
- Keep abuse/security logs under separate purpose, retention, and access controls.

## 13. Implementation phases

### Phase 1 — Governance before code

Approve:

- Business questions
- Events and properties
- Consent/legal basis
- Privacy notice text
- Retention period
- Access roles
- Suppression threshold
- Data-subject access/deletion behavior
- DPO/security owner

### Phase 2 — Activity only

- Add controlled event service and schema.
- Instrument page/project/map/search/download/submission events.
- Exclude free text and demographic data.
- Verify server/client deduplication and bot/internal traffic rules.
- Release aggregate activity dashboard.

### Phase 3 — Consent and optional demographics

- Add separate consent and demographic response models.
- Add optional age-band, gender, audience-type, and region questions.
- Keep skip behavior prominent.
- Add withdrawal/deletion paths.

### Phase 4 — Aggregate demographic reporting

- Build daily aggregates.
- Apply suppression and response-rate disclosure.
- Restrict exports.
- Run privacy/security review and re-identification tests.

## 14. Acceptance criteria

Do not call the feature complete until:

- Event names/properties are allowlisted and tested.
- No raw search/report/feedback text enters analytics.
- No raw or hashed IP/user-agent is used as an analytics identity.
- Unique-visitor counts are labeled according to consent/identifier limitations.
- Downloads are measured at a documented server-observable point.
- Age uses bands rather than birth date.
- Demographics are optional and self-declared.
- Skipping does not block core services.
- Consent can be withdrawn and collection stops.
- Demographic answers are separately protected.
- Small cohorts are suppressed.
- Every chart shows `Not provided` and response coverage.
- Authorized aggregate exports are audited.
- Retention/deletion jobs are tested.
- The privacy notice matches actual behavior.
- No analytics failure interrupts InfraWatch public-service workflows.
