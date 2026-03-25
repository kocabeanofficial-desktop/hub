// Types matching Supabase table schemas

export interface DbClient {
  id: string;
  business_name: string;
  trading_name: string | null;
  company_registration: string | null;
  email: string | null;
  phone: string | null;
  industry: string | null;
  website_url: string | null;
  vat_number: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DbContact {
  id: string;
  client_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbProject {
  id: string;
  client_id: string;
  project_name: string | null;
  project_type: string;
  priority: string;
  description: string | null;
  stage: string;
  due_date: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbTask {
  id: string;
  title: string;
  description: string | null;
  client_id: string | null;
  project_id: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  source: string;
  task_type: string | null;
  assigned_to: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbReport {
  id: string;
  client_id: string | null;
  project_id: string | null;
  report_type: string;
  title: string | null;
  status: string;
  period_start: string | null;
  period_end: string | null;
  summary: string | null;
  file_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbIntakeSubmission {
  id: string;
  submitter_name: string | null;
  submitter_email: string | null;
  submitter_phone: string | null;
  business_name: string | null;
  requested_services: string | null;
  status: string;
  created_at: string;
}

export interface DbAutomationEvent {
  id: string;
  event_type: string;
  event_source: string | null;
  status: string;
  created_at: string;
  client_id: string | null;
  project_id: string | null;
  message: string | null;
  payload: Record<string, unknown>;
}
