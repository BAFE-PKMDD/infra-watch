// Hand-written, intentionally compact description of the only tables MYDAS is
// allowed to query. Keeping this short keeps the per-question prompt (and cost)
// small, and keeping it hand-written (not introspected) means the AI only ever
// learns about columns we explicitly chose to expose.

export const MYDAS_ALLOWED_TABLES = ["projects", "feedback", "issues", "contact_messages"] as const;

export const MYDAS_SCHEMA_DESCRIPTION = `
TABLE projects — one row per AMEFIP/INS infrastructure project
  id uuid, abemis_id text, name text, description text
  status text (e.g. 'Completed', 'Ongoing', 'Not Yet Started', 'Suspended')
  province text, municipality text, barangay text, region text
  budget numeric, contract_amount numeric
  physical_progress integer (0-100), financial_progress integer (0-100)
  implementing_agency text, contractor_name text
  start_date timestamp, target_completion_date timestamp, actual_completion_date timestamp
  operating_unit text, banner_program text, year_funded text
  project_type text, program text ('AMEFIP' or 'INS'), farm_operation text
  created_at timestamp, updated_at timestamp

TABLE feedback — citizen feedback on a project (project_id references projects.abemis_id)
  id uuid, project_id text, rating integer (1-5), comment text
  category text, sentiment text ('positive' | 'negative'), issue_type text
  status text ('pending' | 'approved' | 'rejected' | 'flagged'), helpful_count integer
  created_at timestamp

TABLE issues — citizen-reported issues, including e-report and SMS grievances
  (project_id references projects.abemis_id, nullable when no project was matched)
  id uuid, ticket_number text, project_id text, category text, issue_type text
  status text ('submitted' | 'in_progress' | 'resolved' | ...), priority text ('low' | 'normal' | 'high' | 'urgent')
  description text, region text, province text, municipality text, barangay text
  resolved_at timestamp, created_at timestamp

TABLE contact_messages — general contact-us form submissions
  id uuid, name text, email text, subject text, message text
  status text ('new' | 'in_progress' | 'resolved'), created_at timestamp
`.trim();
