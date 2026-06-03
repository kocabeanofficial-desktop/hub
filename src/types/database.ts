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
  client_origin?: string;
  migration_status?: string;
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
  // Contact info
  full_name: string | null;
  email: string | null;
  phone: string | null;
  preferred_contact: string | null;
  business_name: string | null;
  business_registration: string | null;
  // Package / Pricing
  selected_package: string | null;
  setup_fee: string | null;
  monthly_fee: string | null;
  // Domain
  domain_status: string | null;
  existing_domain: string | null;
  domain_provider: string | null;
  domain_access: string | null;
  preferred_domains: string | null;
  // Business Info
  industry: string | null;
  operating_area: string | null;
  business_overview: string | null;
  ideal_customers: string | null;
  customer_problem_solved: string | null;
  trust_factors: string | null;
  // Website Goals
  website_goals: string | null;
  main_visitor_action: string | null;
  pages_needed: string | null;
  main_services_products: string | null;
  // Content & Assets
  content_status: string | null;
  logo_status: string | null;
  brand_colours_status: string | null;
  photos_status: string | null;
  upload_note: string | null;
  // Design Preferences
  design_style: string | null;
  website_examples_liked: string | null;
  websites_disliked: string | null;
  competitors: string | null;
  features_needed: string | null;
  // Email / Hosting
  mailbox_count: string | null;
  requested_email_addresses: string | null;
  // Timeline
  start_timing: string | null;
  launch_deadline: string | null;
  // Legacy / simple fields still in DB
  business_type: string | null;
  business_description: string | null;
  has_logo: boolean | null;
  logo_url: string | null;
  has_domain: boolean | null;
  domain_name: string | null;
  needs_email: boolean | null;
  website_goal: string | null;
  selected_pages: string | null;
  has_images: boolean | null;
  // Notes & Metadata
  final_notes: string | null;
  additional_notes: string | null;
  source: string | null;
  intake_bucket?: string | null;
  service_type?: string | null;
  campaign?: string | null;
  trade?: string | null;
  domain_of_interest?: string | null;
  current_website?: string | null;
  contract_term?: string | null;
  needs_logo?: boolean | null;
  project_type?: string | null;
  preferred_date?: string | null;
  preferred_time?: string | null;
  estimated_timeline?: string | null;
  requested_services?: string | null;
  processing_notes?: string | null;
  raw_payload: Record<string, unknown> | null;
  client_id: string | null;
  project_id: string | null;
  status: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
  created_at: string;
  updated_at: string | null;
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
  source: string | null;
  started_at: string | null;
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

export interface DbWhmServer {
  id: string;
  label: string;
  base_url_alias: string | null;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbWhmSyncRun {
  id: string;
  server_id: string | null;
  started_at: string;
  finished_at: string | null;
  status: string;
  accounts_seen: number;
  domains_seen: number;
  matched_accounts: number;
  unmatched_accounts: number;
  error_summary: string | null;
  created_at: string;
}

export interface DbWhmAccount {
  id: string;
  server_id: string | null;
  sync_run_id: string | null;
  whm_user: string;
  primary_domain: string | null;
  owner: string | null;
  plan: string | null;
  ip_address: string | null;
  status: string | null;
  raw_status: string | null;
  disk_used_mb: number | null;
  disk_quota_mb: number | null;
  bandwidth_used_mb: number | null;
  bandwidth_quota_mb: number | null;
  match_status: string;
  matched_client_id: string | null;
  match_confidence: number | null;
  last_seen_at: string;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface DbWhmDomainObservation {
  id: string;
  whm_account_id: string;
  domain_name: string;
  domain_type: string | null;
  document_root: string | null;
  last_seen_at: string;
  created_at: string;
}

export interface DbClientRelationship {
  id: string;
  source_client_id: string;
  related_client_id: string;
  relationship_type: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbClientHistoryNote {
  id: string;
  client_id: string;
  note_type: string;
  note: string;
  created_by: string | null;
  created_at: string;
}

export type ServiceReminderLevel = "ok" | "upcoming" | "due_soon" | "urgent" | "due_today" | "overdue";

export interface DbMonitoredService {
  id: string;
  service_name: string;
  service_type: string;
  provider: string | null;
  environment: string;
  service_url: string | null;
  login_url: string | null;
  hostname: string | null;
  status: string;
  health: string;
  monthly_cost: number;
  currency: string;
  billing_cycle: string;
  next_due_date: string | null;
  notes: string | null;
  admin_notes: string | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbServicePaymentReminder {
  id: string;
  service_id: string;
  due_date: string;
  reminder_level: ServiceReminderLevel;
  amount: number | null;
  currency: string;
  status: string;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbServiceCheckLog {
  id: string;
  service_id: string;
  checked_at: string;
  health: string;
  status_code: number | null;
  response_time_ms: number | null;
  reminder_level: ServiceReminderLevel | null;
  message: string | null;
  created_at: string;
}
