# InfraWatch: Simple feature and next-steps guide

Prepared for Ran Ray Alcantara's presentation on August 27, 2026

This is the plain-language version of the full InfraWatch development roadmap.

## A short explanation of InfraWatch

InfraWatch is a website for viewing government infrastructure projects and reporting problems.

The public can use it to:

- Find infrastructure projects.
- View project details and progress.
- See projects on a map when official coordinates are available.
- Report a problem and attach photos or videos.
- Track a submitted report.
- Ask the ANIA chatbot about available project information.

Authorized staff can use it to:

- View project statistics.
- Find delayed or at-risk projects.
- Review citizen reports.
- Reply to reports.
- Review feedback, data problems, and synchronization results.

The system already does many of these things. Some features still need work before they are complete.

## Simple presentation statement

> "InfraWatch puts infrastructure project information in one place. It helps the public find projects, view maps, submit reports with location-based evidence, and ask questions through ANIA. It also helps government staff monitor project progress and identify projects that may need attention. Our next step is to improve data updating and complete the process for assigning, answering, escalating, and closing citizen reports."

## Current data situation

- InfraWatch currently has 25,916 project records.
- 16,541 projects have usable official coordinates and can appear on the map.
- 9,375 projects do not have usable coordinates, so they are not placed on the map.
- InfraWatch does not invent locations for projects with missing coordinates.
- The last successful project update was August 11, 2026.
- Ten project update attempts have failed since then.

The projects can still be shown during the presentation, but the data should not be described as live or real-time.

## The 12 proposed features in simple terms

The status labels mean:

- Working: The feature can be demonstrated.
- Partly working: Some parts work, but the full process is not finished.
- Not started: The feature is still planned.

| # | Feature | Simple status | What works now | What still needs to be done |
|---|---|---|---|---|
| 1 | Infrastructure Analytics Dashboard | Working, with limits | Staff can view project counts, approved budgets, project status, delayed projects, regions, project types, and detailed project lists. | Fix data updating. Do not call approved budget "money spent." Improve forecasts as more history becomes available. |
| 2 | GeoVideo Documentation | Partly working | Citizens can attach videos, photos, coordinates, and recorded location tracks to reports. Staff and the report owner can review them. | Add formal field checking, before-and-after comparison, approval before public display, and offline uploading. |
| 3 | AI Information Service | Working, if properly configured | ANIA can answer questions about project records and totals. It cannot change official records. | Add an approved FAQ library, clearer sources, regular accuracy tests, and administrator controls. |
| 4 | Citizen e-Reporting | Working, with limits | Signed-in citizens can report problems, select a project or location, attach evidence, and track the report. | Fix the misleading anonymous option, improve accessibility, assign reports to staff, add response deadlines, and complete the closing process. |
| 5 | SMS Connect | Not started | There is no working SMS service yet. | Choose an SMS provider and add consent, message templates, delivery tracking, retries, and opt-out support. |
| 6 | Administrative Monitoring Dashboard | Partly working | Staff can view project analytics, citizen reports, feedback, data problems, update history, users, and audit records. | Create one simple work list showing what needs attention today, who is responsible, and what is overdue. |
| 7 | Infrastructure Map | Partly working | Projects with valid official coordinates appear on a map. Missing locations are left out and counted. | Fix filters, colors, loading speed, accessibility, and incorrect map layers. Use only real approved map layers. |
| 8 | Unified Project Database | Working, with limits | InfraWatch keeps a searchable local copy of project information received from ABEMIS. | Make data updates reliable, improve duplicate checking, document backups, and prepare a safer structure before adding other data sources. |
| 9 | Open Data Export | Not started | The website shows an export button, but downloading CSV or JSON is not implemented. | Add safe downloads using public fields only. Include the data source and date of the latest successful update. |
| 10 | Automatic Complaint Routing | Not started | Staff notifications and regional access rules provide a starting point. | Add report assignment, staff self-claiming, office-routing rules, response deadlines, escalation, and assignment history. |
| 11 | Project Red Flag Monitoring | Partly working | The dashboard can identify delayed and at-risk projects using clear rules. It can also show limited completion estimates when enough history exists. | Add a full watchlist, responsible officer, action taken, due date, supporting evidence, and complete history. |
| 12 | Monitoring Different Infrastructure Types | Working, with limits | InfraWatch can store and group different infrastructure types, not only farm-to-market roads. | Create separate approved monitoring questions and indicators for irrigation, warehouses, greenhouses, fisheries, cold storage, renewable energy, and other types. |

## Most important work to do next

### 1. Fix project data updating

Ten updates have failed since the last successful update on August 11.

The system needs to:

- Show why an update failed.
- Notify authorized staff when it fails.
- Try again safely.
- Prevent two updates from running at the same time.
- Check that all source records were received.
- Keep showing the last good data with a clear warning that it is old.

### 2. Complete the citizen report process

A citizen report should follow a clear path:

> Submitted -> checked -> assigned -> acknowledged -> acted on -> resolved -> citizen notified

InfraWatch still needs:

- A responsible person or office for each report.
- Official response deadlines approved by BAFE.
- A list of unassigned and overdue reports.
- Escalation when a report is not handled on time.
- A reason and evidence when a report is closed.
- A complete history that cannot be silently removed.

### 3. Fix security and privacy issues

Before adding assignment and response deadlines:

- Staff must only see reports and records they are allowed to see.
- Internal notes must not appear in broad audit-log views.
- Report changes must be saved as one complete action so records cannot be left half-updated.
- The rules for deleting or archiving reports must be approved.
- The "Submit as anonymous" option must be corrected. It currently requires sign-in and asks for a phone number before discarding that number.

### 4. Improve the map

The map needs several corrections:

- Remove the sample watershed and agricultural-zone shapes. They are not real GeoServer data.
- Fix the AMEFIP and INS filters.
- Make the map colors match the legend.
- Correct the old "FMR Watch Projects" label.
- Improve loading speed by loading only the projects needed for the current map view.
- Make the map usable with a keyboard and screen reader.
- Continue leaving out projects without official coordinates.

### 5. Add safe public downloads

The public should eventually be able to download project data as CSV or JSON.

The download must:

- Include public project fields only.
- Follow the filters selected by the user.
- Show where the data came from.
- Show when it was last updated successfully.
- Leave out citizen information, private notes, and internal source details.

### 6. Add SMS after the report process is stable

SMS should begin as a small pilot. Citizens could receive messages when:

- A report is received.
- A report is acknowledged.
- Staff ask for more information.
- A report is resolved or closed.

SMS messages should not include private descriptions, exact evidence locations, internal notes, or staff identities.

## Problems to fix before or soon after the presentation

### Before the presentation

1. Check whether the project directory and map load correctly in the exact browser and computer that will be used.
2. Clearly state that the last successful project update was August 11, 2026.
3. Keep the sample watershed and agricultural-zone map layers turned off.
4. Make sure the presentation version contains the latest dashboard and chart-detail work. These changes are currently not committed.
5. Review visible test content before showing the citizen evidence pages.
6. Prepare screenshots or a short backup video in case the internet or local server fails.
7. Avoid a risky last-minute production update unless there is a tested rollback plan.

### Important development fixes

1. Protect internal notes and private report information in audit logs.
2. Stop users from jumping freely between report statuses.
3. Save a reply, status change, history entry, and notification together.
4. Replace random ticket-number creation with a guaranteed unique number from the database.
5. Store the date when the citizen first noticed the problem.
6. Store unknown locations as blank, not as the made-up text "N/A."
7. Fix form labels and error messages for people using assistive technology.
8. Improve duplicate and project-ID checking during data updates.
9. Replace the chatbot's full project-record lookup with an approved list of public fields.
10. Update old documents and website text that claim features that are not yet working.

## What to show during the presentation

A simple demonstration order:

1. Show the homepage and explain the purpose of InfraWatch.
2. Search for a project and open its project page.
3. Show the public statistics page.
4. Show the project map and explain that only projects with official coordinates appear.
5. Show how a citizen prepares a report with a photo or video. Avoid creating an unwanted live record.
6. Show how a citizen tracks a report.
7. Show how staff review and answer reports.
8. Show the management dashboard and open the project list behind a chart.
9. Ask ANIA one simple question that can be checked against the displayed data.
10. End with the next-steps list.

## What not to say

Do not say:

- "The project data is real-time."
- "InfraWatch shows how much money has been spent."
- "InfraWatch can prove that a project is over budget."
- "AI predicts every project outcome."
- "All projects are shown on the map."
- "GPS evidence cannot be faked."
- "The watershed and agricultural-zone layers are already connected to GeoServer."
- "CSV and JSON downloads already work."
- "SMS is already connected."
- "Reports are automatically assigned and escalated."
- "Official response deadlines are already active."
- "Anonymous reporting is fully available."

Say this instead:

- "InfraWatch shows a local copy of project data received from ABEMIS and displays the last successful update."
- "The financial figures currently show approved budget and supplier bid amounts. Actual spending is not yet available."
- "The system uses clear rules to warn staff about possible delays."
- "The map only shows projects with valid official coordinates."
- "Location-based evidence helps staff review a report, but it still needs proper validation."
- "Assignment, response deadlines, automatic routing, data downloads, and SMS are part of the next development phase."

## Simple development schedule

### First: make the current system reliable and safe

- Fix project data updating.
- Fix private audit-log access.
- Fix report status changes and history.
- Fix the map controls and false map layers.
- Test the exact presentation setup.

### Next: complete report handling

- Assign each report to a person or office.
- Add approved response deadlines.
- Add overdue-report warnings and escalation.
- Notify citizens when something important happens.
- Record the reason and evidence when a report is closed.

### Then: improve public access

- Add CSV and JSON downloads.
- Improve official map coverage.
- Start a small SMS pilot.
- Add offline or resumable uploads for weak internet connections.

### Later: improve analysis

- Test whether completion estimates are accurate.
- Add approved monitoring rules for each infrastructure type.
- Give ANIA an approved question-and-answer library with clear sources.
- Add a management record showing what action was taken for flagged projects.

## Decisions needed from management

Management needs to decide:

1. How urgent, high, normal, and low-priority reports are defined.
2. How quickly staff must acknowledge and resolve each type of report.
3. Whether deadlines count weekends, holidays, and hours outside the office.
4. Which person, office, region, or program should receive each type of report.
5. How long reports and their history must be kept.
6. Which report details may be shown publicly.
7. Which official field represents actual spending, if that information exists.
8. Which official map layers InfraWatch is allowed to display.
9. Which fields the public may download.
10. Which SMS provider and message budget will be used.
11. Which measurements apply to each infrastructure type.
12. Who is responsible for failed updates, data problems, citizen reports, and ANIA content.

## Final next-steps slide

Already working:

- Searchable project records
- Public project information
- Project statistics and management dashboard
- Maps using official project coordinates
- Citizen reports with photos, videos, and location information
- Citizen report tracking
- ANIA project information assistant
- Staff pages for reports, feedback, users, updates, and data checks

Build or fix next:

1. Reliable project data updates
2. Secure report history and privacy
3. Report assignment and response deadlines
4. Overdue-report escalation and automatic routing
5. Safe CSV and JSON downloads
6. Correct and faster maps
7. Project watchlists and action tracking
8. Better citizen updates and closure information
9. SMS pilot
10. Better GeoVideo field checking
11. Monitoring rules for each infrastructure type
12. Better tested project completion estimates

The detailed technical version is available in `docs/INFRAWATCH-NEXT-STEPS-ROADMAP.md`.
