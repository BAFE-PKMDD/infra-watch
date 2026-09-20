// Aligned to the 8888 Citizens' Complaint Center standard: the concerned agency must
// report back on the action taken within 72 hours. Applied uniformly to issues (time to
// first public response) and feedback (time to a moderation decision) — shared by the
// SLA reports (actions/query/reports.query.ts) and the follow-up reminder job
// (lib/sla-followup.ts) so both always agree on what counts as a breach.
export const SLA_BREACH_HOURS = 72;

// Follow-up reminder checkpoints, as hours since submission:
// - Gentle (~1/3 of the window): nudges the scoped moderator(s) only.
// - Urgent (~5/6 of the window): moderator(s) + admins, since a moderator who still
//   hasn't acted this close to breach may be unavailable and needs a backup.
// - Breach itself is notified separately, to admins only, once SLA_BREACH_HOURS passes.
export const SLA_GENTLE_REMINDER_HOURS = 24;
export const SLA_URGENT_REMINDER_HOURS = 60;
