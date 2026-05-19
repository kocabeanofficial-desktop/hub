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
  client_id: string | null;
  project_id: string | null;
  source: string;
  submitter_name: string | null;
  submitter_email: string | null;
  submitter_phone: string | null;
  whatsapp_number: string | null;
  business_name: string | null;
  requested_services: string | null;
  raw_payload: Record<string, unknown>;
  status: string;
  processing_notes: string | null;
  campaign: string | null;
  campaign_data: Record<string, unknown> | null;
  trade: string | null;
  domain_of_interest: string | null;
  contract_term: string | null;
  needs_logo: boolean | null;
  project_type: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  estimated_timeline: string | null;
  current_website: string | null;
  service_type: string | null;
  created_at: string;
  updated_at: string;
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

export interface DbService {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DbClientService {
  id: string;
  client_id: string;
  service_code: string;
  status: string;
  is_active: boolean;
  billing_cycle: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbHostingAccount {
  id: string;
  client_id: string;
  cpanel_username: string | null;
  status: string;
  server: string | null;
  ip_address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbDomain {
  id: string;
  client_id: string;
  domain_name: string;
  tld: string | null;
  status: string;
  ssl_status: string | null;
  registrar: string | null;
  domain_expiry: string | null;
  ssl_expiry: string | null;
  hosting_account_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbMailbox {
  id: string;
  client_id: string;
  email_address: string;
  status: string;
  hosting_account_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
