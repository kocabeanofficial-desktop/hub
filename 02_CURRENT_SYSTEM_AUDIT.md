# 02_CURRENT_SYSTEM_AUDIT

**Date audited:** 21 May 2026  
**Project:** Koca Bean Command Centre (hub.kocabean.co.za)  
**Lovable Project ID:** 13014076-d301-4351-acf7-2cdb2daadb34  
**GitHub Repo:** kocabeanofficial-desktop/koca-bean-hub  
**External Supabase Project:** yxccaoiznqklgnxdsdlr.supabase.co  

---

## 1. Admin Dashboard Structure

### Current Admin Pages / Routes

| File Path | Route | Purpose |
|---|---|---|
| `src/pages/admin/AdminDashboard.tsx` | `/admin` | Main overview dashboard with stat cards |
| `src/pages/admin/Enquiries.tsx` | `/admin/enquiries` | Enquiry list and inline detail view |
| `src/pages/admin/Clients.tsx` | `/admin/clients` | Client list page |
| `src/pages/admin/ClientDetail.tsx` | `/admin/clients/:clientId` | Single client detail page |
| `src/pages/admin/Projects.tsx` | `/admin/projects` | Project list page |
| `src/pages/admin/Projects.tsx` | `/admin/projects/:projectId` | Project detail (route exists, same or separate component - needs verification) |
| `src/pages/admin/Support.tsx` | `/admin/support` | Support tickets |
| `src/pages/admin/TaskManager.tsx` | `/admin/tasks` | Task manager |
| `src/pages/admin/SEOTracking.tsx` | `/admin/seo` | SEO tracking |
| `src/pages/admin/Reports.tsx` | `/admin/reports` | Reports |
| `src/pages/admin/Hosting.tsx` | `/admin/hosting` | Hosting/domains/mailboxes overview |
| `src/pages/admin/ZohoImports.tsx` | `/admin/imports` | Zoho import utility |
| `src/pages/admin/ActivityLog.tsx` | `/admin/activity` | Activity log |
| `src/pages/admin/Renewals.tsx` | `/admin/renewals` | Renewal list |
| `src/pages/admin/RenewalDetail.tsx` | `/admin/renewals/:id` | Renewal detail |
| `src/pages/admin/WebsiteContent.tsx` | `/admin/websites/...` | Website content management |
| `src/pages/admin/PageContentEditor.tsx` | `/admin/websites/...` | Page content editor |

### Admin Dashboard Stat Cards (confirmed from live app at time of audit)
- Open Enquiries: 0
- Active Clients: 4
- Active Projects: 5
- Sites In Progress: 5
- Open Support: 0
- Reports Pending: 2

### Navigation Menu Items (confirmed from live sidebar)
Dashboard, Enquiries, Clients, Projects, Tasks, Support, SEO Tracking, Reports, Hosting, Renewals, Imports, Activity Log

---

## 2. Enquiries System

### Enquiry Page Files
- `src/pages/admin/Enquiries.tsx` — list page with inline detail toggle
- `src/components/enquiries/EnquiryDetailPage.tsx` — full detail/action component rendered inside Enquiries page
- `src/components/enquiries/IceboxDetailModal.tsx` — modal for icebox/rejected enquiries

### intake_submissions Fields Used in UI (from DbIntakeSubmission type + API confirmation)

**Contact Info:** id, full_name, email, phone, preferred_contact, business_name, business_registration, whatsapp_number  
**Package/Pricing:** selected_package, setup_fee, monthly_fee  
**Domain:** domain_status, existing_domain, domain_provider, domain_access, preferred_domains, domain_name, current_registrar  
**Business Info:** industry, operating_area, business_overview, ideal_customers, customer_problem_solved, trust_factors  
**Website Goals:** website_goals, main_visitor_action, pages_needed, main_services_products, content_status  
**Technical:** has_logo, logo_url, has_domain, needs_email, website_goal, selected_pages, has_images  
**Additional DB columns:** wants_website_design, wants_email_services, wants_service_management, wants_domain_registration, wants_basic_seo, wants_marketing, campaign, contract_term, needs_logo, trade, domain_of_interest, project_type, preferred_date, preferred_time, estimated_timeline, service_type, campaign_data, design_service, project_details, has_mailboxes, submitter_message, additional_notes, source, raw_payload  
**Metadata:** client_id, project_id, status, created_at, updated_at, processing_notes

### Statuses Available (from Enquiries.tsx select filter options)
`all`, `new`, `contacted`, `icebox`, `rejected`, `activated` (inferred from guard logic)

### Actions Available
- View detail (click row opens EnquiryDetailPage inline)
- Status change (handleStatusChange updates intake_submissions.status)
- Activate Client button (handleActivate)
- Reject / WhatsApp actions (buttons in IceboxDetailModal)
- Copy website brief to clipboard (buildWebsiteBrief)
- Copy invoice template (buildInvoiceCopy — ZOHO INVOICE CREATION)
- Copy Zoho customer template (buildZohoCustomerCopy)

### How "Activate Client" Currently Works
Located in `src/components/enquiries/EnquiryDetailPage.tsx`, handleActivate function (~line 295):

1. **Guard:** If `enq.client_id || enq.project_id` already set — shows "Already activated" toast and returns immediately. Cannot re-activate.
2. Sets converting state to true
3. Creates a record in `clients` table with: business_name, trading_name, email, phone, industry, website_url (from existing_domain or domain_name), notes (from business_overview), status: "active"
4. Creates a record in `projects` table with: client_id, project_name: `Website - [business_name]`, **project_type: "website_build" (hardcoded regardless of service type)**, priority: "medium", stage: "enquiry_received", description (from website_goals)
5. Updates `intake_submissions` with: status: "activated", client_id, project_id
6. Invalidates React Query caches for intake_submissions, clients, projects
7. Shows toast: "Client & project created successfully"

### Whether Admin Can Edit Intake Fields Before Activation
Not confirmed from codebase. The EnquiryDetailPage shows fields as read-only with copy buttons. No edit form for intake fields was found.

### Where Activation Logic Lives
`src/components/enquiries/EnquiryDetailPage.tsx` — handleActivate async function

### Whether Activation is Service-Type Aware
**No.** project_type is always hardcoded to "website_build". The intake_submissions.service_type field is collected but NOT used in handleActivate.

### Whether Activated Enquiries Can Be Activated Again
**No.** Guard: `if (enq.client_id || enq.project_id)` prevents re-activation with "Already activated" toast.

---

## 3. Client System

### Client List / Detail Page Files
- `src/pages/admin/Clients.tsx` — client list
- `src/pages/admin/ClientDetail.tsx` — client detail (/admin/clients/:clientId)
- `src/components/clients/ClientHostingSection.tsx` — hosting section component used in client detail

### Database Tables Used
clients, projects, hosting_accounts, domains, mailboxes, client_services, intake_submissions

### clients Table Fields (confirmed from live API)
id, business_name, trading_name, company_registration, vat_number, industry, website_url, notes, status, created_at, updated_at, email, phone, full_name, last_contacted_at, lifecycle_notes, zoho_customer_id

### Actions Available
- View client detail
- Edit client fields (assumed, detail page exists)
- View linked projects
- View linked hosting accounts
- View linked domains
- View linked services

### How Linked Data is Loaded
Via custom hooks: useHostingAccounts, useDomains, useMailboxes, useClients (imported in Hosting.tsx). In ClientDetail, queries use client_id filter.

### Whether Clients Can Have Linked/Related Businesses
**Not currently found.** No related_businesses table, parent_client_id, or linked business structure exists in the clients table or schema.

### Whether Clients Can Have Multiple Services
**Yes.** client_services table supports multiple service records per client_id.

---

## 4. Project System

### Project List / Detail Files
- `src/pages/admin/Projects.tsx` — project list (and possibly detail)

### projects Table Fields (confirmed from live API)
id, client_id, project_name, project_type, stage, priority, description, internal_notes, requested_start_date, due_date, completed_at, created_by, assigned_to, created_at, updated_at, progress_stage

### Project Statuses / Progress Steps
stage field values — confirmed value on activation: "enquiry_received". Full enum not confirmed. progress_stage field also exists (purpose needs verification).

### Which Table Stores Projects
`projects` table in external Supabase (yxccaoiznqklgnxdsdlr.supabase.co)

### How Projects Link to Clients
`projects.client_id` (UUID foreign key to clients.id)

### How Projects Link Back to Intake Submissions
`intake_submissions.project_id` is set during activation. The projects table does NOT have an intake_submission_id column — link is one-directional from intake_submissions.

### Whether Projects Are Created Automatically During Activation
**Yes.** handleActivate always creates a project.

### Whether Project Creation Depends on Service Type or Plan
**No.** Always creates project_type: "website_build" regardless of intake service_type.

---

## 5. Hosting System

### Hosting Page Files
- `src/pages/admin/Hosting.tsx` — main hosting overview page
- `src/components/clients/ClientHostingSection.tsx` — hosting component in client detail

### Hosting Components (imports confirmed in Hosting.tsx)
DashboardLayout, StatCard, StatusBadge, useHostingAccounts, useDomains, useMailboxes, useClients, Server/Globe/Mail/ShieldAlert icons from lucide-react

### Tables Queried
hosting_accounts, domains, mailboxes, clients (for name lookup)

### Current Dashboard Cards / Counts (confirmed from live app)
- **Hosting Accounts:** accounts.length — total all accounts (64 at audit time)
- **Active Domains:** activeDomains — count of domains with active status (62 at audit time)
- **Active Mailboxes:** activeMailboxes — count of active mailboxes (0 — table empty)
- **SSL Alerts:** count of domains with expired/expiring ssl_status (2 at audit time)

### Hosting Accounts List Fields (confirmed from live app screenshot)
CLIENT, CPANEL USER, SERVER, STATUS

### hosting_accounts Table Fields (confirmed from live API)
id, client_id, cpanel_username, cpanel_package, server, status, disk_quota_mb, disk_used_mb, bandwidth_quota_mb, bandwidth_used_mb, ip_address, notes, activated_at, suspended_at, created_at, updated_at

### Whether Rows Are Clickable
**No.** The `<tr>` elements have hover CSS (hover:bg-muted/20) but NO onClick handler. Rows are not clickable.

### Whether Detail/Edit Pages Exist
**No.** No `/admin/hosting/:accountId` route exists. No hosting detail or edit page found.

### Whether Admin Can Edit Hosting Records
**Not confirmed.** No edit form for hosting_accounts found in reviewed code.

### Whether Domains Are Managed Inside Hosting or Separately
Domains are displayed on the same /admin/hosting page in a separate section. No separate /admin/domains route was found.

### Whether Mailboxes Are Managed Inside Hosting or Separately
Mailboxes are listed on the /admin/hosting page. The table is currently empty. No mailbox creation UI confirmed.

### Where SSL Alerts Come From
ssl_status field on domains table. Alert count = domains where ssl_status is "expired" or similar warning value.

### What the Stat Cards Currently Count
- **Active Domains (62):** COUNT of domains with status = "active"
- **Hosting Accounts (64):** COUNT all hosting_accounts rows
- **Active Mailboxes (0):** COUNT of mailboxes rows (table empty)
- **SSL Alerts (2):** COUNT of domains with expired/warning ssl_status

---

## 6. Domain System

### Domain Tables
`domains` table in external Supabase

### domains Table Fields (confirmed from live API)
id, client_id, hosting_account_id, domain_name, tld, registrar, status, ssl_status, ssl_expiry, domain_expiry, auto_renew, dns_configured, is_primary, notes, created_at, updated_at

### Domain Status Options
Confirmed from hostingStatusColors in Hosting.tsx: active, suspended, pending, over_quota  
SSL status options: active, expired, pending, none

### Where Domains Are Displayed
- On /admin/hosting page (section below Hosting Accounts)
- In ClientDetail via ClientHostingSection component

### Where Domains Can Be Added / Edited
**Not confirmed.** No domain add/edit form identified. Appears read-only. Needs verification.

### Whether Domains Link to Clients
**Yes.** domains.client_id foreign key.

### Whether Domains Link to Hosting Accounts
**Yes.** domains.hosting_account_id (nullable).

### Whether Domains Link to Services
**Not directly.** No service_id field on domains.

### Whether Domain Availability Checking Exists
**Not currently found.**

### Whether Renewal Dates Exist
**Yes.** domains.domain_expiry field exists. renewal_invoices table also has renewal_date and domain_or_service fields.

---

## 7. Mailbox System

### Mailbox Tables
`mailboxes` table in external Supabase (currently 0 rows)

### mailboxes Table Fields (from DbMailbox type in src/types/database.ts)
id, client_id, email_address, status, hosting_account_id, notes, created_at, updated_at

### Where Mailboxes Are Displayed
On /admin/hosting page. Active Mailboxes stat card shows 0.

### Whether Mailbox Creation/Editing UI Exists
**Not confirmed.** No add/edit form for mailboxes found in reviewed code.

### Whether Mailboxes Link to Domains
**No.** DbMailbox has no domain_id field. Mailboxes only link to hosting_account_id.

### Whether Mailboxes Link to Hosting Accounts
**Yes.** mailboxes.hosting_account_id (nullable).

### Whether Mailbox Status Exists
**Yes.** mailboxes.status field.

### Whether Password Storage Exists Anywhere
**No.** No password field in the mailboxes table or DbMailbox type.

---

## 8. Services / Plans System

### Tables Found
- `services` table — lookup/catalogue of service types
- `client_services` table — active service subscriptions per client
- No `service_plans` table found (API hint suggested `services` table instead)

### services Table Fields (confirmed from live API)
id, code, name, category, description, is_active, created_at

### client_services Table Fields (confirmed from live API)
id, client_id, service_code, is_active, source, started_at, notes, created_at, updated_at, status, billing_cycle, billing_amount, renewal_date, suspended_at, cancelled_at, cancellation_reason

### How Active Services Are Created
**Not confirmed from code reviewed.** No UI for creating client_services records found. The activation flow does NOT create a client_services record.

### How Services Link to Clients
`client_services.client_id` foreign key.

### How Services Link to Projects, Domains, Hosting, or Mailboxes
**Not confirmed.** No service_id or service_code foreign key found on projects, domains, hosting_accounts, or mailboxes.

### Whether Service Type Controls Dashboard Behaviour
**No.** intake_submissions.service_type is not used in the activation or project creation flow.

### Whether Non-Project Services Are Supported
**Not currently implemented.** Activation always creates a project. No separate flow for email-only, domain-only, or hosting-only services.

---

## 9. Returning Clients / Linked Businesses

### Linking a New Enquiry to an Existing Client
**Not currently found.** Activation always creates a new client record.

### Adding a New Service to an Existing Client
**Not currently found.** No UI flow for adding a client_services record from an enquiry to an existing client.

### Creating a Related Business Under an Existing Client
**Not currently found.** No parent/child client structure in schema.

### Billing Multiple Businesses Under One Account
**Not currently found.** No billing group or account hierarchy.

### Avoiding Duplicate Client Creation
**Not currently found.** No duplicate detection (by email or business_name) before client creation. Activating two enquiries from the same business will create two client records.

---

## 10. Invoice / Payment Flow

### Invoice-Related Tables or Fields
- `manual_invoices` (Lovable Supabase, 0 rows): amount_due, created_at, customer_name, due_date, id, invoice_date, invoice_number, pdf_url, uploaded_by
- `renewal_invoices` (external Supabase): id, client_id, uploaded_by, invoice_number, invoice_date, invoice_due_date, renewal_date, domain_or_service, invoice_amount, balance_due, invoice_file_path, status, created_at, updated_at

### Zoho Invoice Copy Functionality
**Yes — exists.** buildInvoiceCopy(enq) in EnquiryDetailPage.tsx generates a formatted ZOHO INVOICE CREATION text block. Fields: Customer/Business Name, Contact Person, Email, Phone, Package, Setup Fee, Monthly Fee, Domain Request, Mailbox Count, Requested Email Addresses.

### Zoho Customer Copy Functionality
**Yes — exists.** buildZohoCustomerCopy(enq) generates a Zoho customer text block.

### Invoice Upload Functionality
manual_invoices has pdf_url; renewal_invoices has invoice_file_path. Upload capability suggested. Full upload UI not confirmed.

### Payment Status Fields
renewal_invoices.status and renewal_invoices.balance_due exist. No payment_status field on clients or projects confirmed.

### Whether Setup Is Locked Until Paid
**Not currently found.** No payment locking in activation flow.

### Whether Payment Logs Exist
**Not currently found.** No payments table found.

### Where Invoice Actions Appear in the UI
- Zoho copy buttons in EnquiryDetailPage (enquiry detail view)
- Renewal invoices managed at /admin/renewals and /admin/renewals/:id (RenewalDetail.tsx)

---

## 11. Activity Logs / Notes

### Notes Tables / Components
- No standalone notes table found in external Supabase
- clients.notes and clients.lifecycle_notes — text fields on client record
- projects.internal_notes — text field on project record
- hosting_accounts.notes, domains.notes, mailboxes.notes — text fields

### Activity Log Tables / Components
- `src/pages/admin/ActivityLog.tsx` — page exists
- No `activity_logs` or `activity_log` table found via REST API (PGRST205 error returned)
- `whm_api_log` table exists but is empty (0 rows)

### What Actions Are Currently Logged
**Needs Verification.** No confirmed activity_log table. ActivityLog page data source unclear.

### Whether Hosting/Domain/Mailbox/Client/Project Actions Are Logged
**Needs Verification.** No confirmed logging mechanism found for CRUD operations.

### Where Notes Are Displayed
Inline on respective record detail pages. No dedicated notes management UI confirmed.

---

## 12. Supabase Tables and Migrations

### External Supabase Project Tables (yxccaoiznqklgnxdsdlr.supabase.co)
Confirmed via authenticated REST API queries on 21 May 2026:

| Table | Key Fields | Relationships | Row Count |
|---|---|---|---|
| intake_submissions | id, client_id, project_id, source, submitter_name, submitter_email, submitter_phone, business_name, requested_services, raw_payload, status, service_type, campaign_data, wants_website_design, wants_email_services, wants_service_management, wants_domain_registration, wants_basic_seo, wants_marketing, additional_notes, campaign, whatsapp_number, current_website, contract_term, needs_logo, trade, domain_of_interest, project_type, preferred_date, preferred_time, estimated_timeline, campaign_data, design_service, project_details, domain_name, current_registrar, has_mailboxes, submitter_message (38 total columns) | → clients, → projects | Active (0 open at audit) |
| clients | id, business_name, trading_name, company_registration, vat_number, industry, website_url, notes, status, email, phone, full_name, last_contacted_at, lifecycle_notes, zoho_customer_id | ← intake_submissions, ← projects | 4 active |
| projects | id, client_id, project_name, project_type, stage, priority, description, internal_notes, requested_start_date, due_date, completed_at, created_by, assigned_to, progress_stage | → clients | 5 active |
| hosting_accounts | id, client_id, cpanel_username, cpanel_package, server, status, disk_quota_mb, disk_used_mb, bandwidth_quota_mb, bandwidth_used_mb, ip_address, notes, activated_at, suspended_at | → clients | 64 |
| domains | id, client_id, hosting_account_id, domain_name, tld, registrar, status, ssl_status, ssl_expiry, domain_expiry, auto_renew, dns_configured, is_primary, notes | → clients, → hosting_accounts | 62 active |
| mailboxes | id, client_id, email_address, status, hosting_account_id, notes | → clients, → hosting_accounts | 0 (empty) |
| client_services | id, client_id, service_code, is_active, source, status, billing_cycle, billing_amount, renewal_date, started_at, suspended_at, cancelled_at, cancellation_reason, notes | → clients | Unknown |
| services | id, code, name, category, description, is_active | Lookup | Unknown |
| task_templates | id, service_code, title, description, task_type, sequence_order, default_priority, is_active | | Unknown |
| tasks | (empty) | | 0 |
| support_tickets | (empty) | | 0 |
| reports | id, project_id, client_id, report_type, title, summary, report_data, file_url, status, period_start, period_end | → clients, → projects | Unknown |
| renewal_invoices | id, client_id, uploaded_by, invoice_number, invoice_date, invoice_due_date, renewal_date, domain_or_service, invoice_amount, balance_due, invoice_file_path, status | → clients | Unknown |
| renewal_actions | id, renewal_invoice_id, client_id, action_type, channel, scheduled_date, status, message_subject, message_body, completed_at | → renewal_invoices, → clients | Unknown |
| websites | id, client_id, name, slug, domain, platform, logo_url, primary_color, is_active | → clients | Unknown |
| pages | id, website_id, title, slug, description, sort_order, is_active | → websites | Unknown |
| admin_users | id, user_id, email, full_name, role, is_active | → auth.users | Unknown |
| whatsapp_contacts | id, wa_phone, display_name, client_id, is_existing_client, first_seen_at, last_seen_at, total_messages, notes | → clients (nullable) | Unknown |
| bot_settings | id, key, value, description, updated_at | | Unknown |
| whm_api_log | (empty) | | 0 |
| whm_quota_checks | (empty) | | 0 |
| project_services | (empty) | | 0 |
| client_actions | (empty) | | 0 |
| website_users | (empty) | | 0 |
| zoho_customers_raw | (empty) | | 0 |
| zoho_invoices_raw | (empty) | | 0 |

### Lovable-Managed Supabase Tables (separate project, from migrations folder)
| Table | Key Fields |
|---|---|
| client_invites | id, client_id, email, token, status, invited_by, invited_at, accepted_at, expires_at |
| email_settings_requests | id, client_id, domain, mailbox_address, request_type, requesting_email, requesting_name, status |
| manual_invoices | id, amount_due, customer_name, due_date, invoice_date, invoice_number, pdf_url, uploaded_by |
| staff_authorizations | id, access_cpanel, access_email, access_website, client_id, owner_email, owner_name, staff_email, staff_full_name, staff_phone, staff_role, status |
| support_tickets | (empty) |
| upgrade_requests | (empty) |
| whm_quota_checks | (empty) |
| zoho_customers | (empty) |
| zoho_invoices | (empty) |

### Migration Files in supabase/migrations/ (18 files found)
20260403113351_7... (creates client_invites table), 20260403150238_..., 20260409082509_..., 20260409082521_..., 20260409083044_..., 20260421201451_4..., 20260422065523_..., 20260422070534_..., 20260422144010_..., 20260515120000_..., 20260515130000_..., 20260515140000_..., 20260517000000_..., 20260517100000_..., 20260517120000_s..., 20260518100000_i..., 20260519133412_d..., 20260520000000_...

---

## 13. RLS and Security

### RLS on Lovable-Managed Tables
- `client_invites` — RLS ENABLED. Policy: "Authenticated users can manage invites" (FOR ALL TO authenticated USING (true) WITH CHECK (true))

### RLS on External Supabase Tables
App uses `sb_publishable_` key + auth JWT. Admin-level queries use authenticated session. Full RLS policy details for external tables not readable without service role key.

### admin_users Table
Exists with user_id, email, full_name, role, is_active. Role-based access enforced via ProtectedRoute component in App.tsx: `if (role && user?.role !== role) return <Navigate>`.

### Edge Functions
- `supabase/functions/send-client-...` — at least one edge function (name truncated in Lovable UI). Likely email-related (send-client-invite or similar).

### Supabase Client Configuration
`src/integrations/supabase/client.ts` — comment: "Single Supabase project (external): all data, auth, edge functions"  
SUPABASE_URL: https://yxccaoiznqklgnxdsdlr.supabase.co  
SUPABASE_KEY: sb_publishable_... (anon-equivalent key, embedded in source code)

### Risky Patterns Found
- Publishable/anon key embedded in `src/integrations/supabase/client.ts` (visible in frontend bundle — standard but worth noting)
- `client_invites` RLS policy uses USING (true) WITH CHECK (true) — all authenticated users can manage all invites (broad policy)
- No service role key visible in frontend (correct practice)

### Public Form Write Safety
Public intake form write path and its RLS policies not confirmed from reviewed code.

---

## 14. Current Problems / Loose Ends Found

### Confirmed Issues from Codebase

1. **Activation always creates a website project regardless of service type.**  
   In `src/components/enquiries/EnquiryDetailPage.tsx` handleActivate: `project_type: "website_build"` is hardcoded. intake_submissions.service_type is ignored. A client signing up for email-only, hosting, or domain services incorrectly gets a "website_build" project.

2. **Activation always creates a project — no non-project service flow.**  
   Even for services that don't require a project (email, domain registration, hosting management), handleActivate unconditionally creates a projects record.

3. **Project name is always "Website - [business_name]" regardless of service.**  
   The project_name string starts with "Website - " regardless of what was actually requested.

4. **No duplicate client detection.**  
   No check for existing client by email or business_name before INSERT. Activating two enquiries from the same business creates two client records.

5. **Hosting account rows are not clickable and there is no hosting detail or edit page.**  
   Confirmed from source: `<tr>` has no onClick. No /admin/hosting/:accountId route exists.

6. **Mailboxes table is empty (0 rows) and no mailbox creation UI was found.**  
   The Active Mailboxes stat shows 0 and no create/edit form was identified for mailboxes.

7. **No returning client flow — new enquiries always create new client records.**  
   No UI exists to link an enquiry to an existing client during activation.

8. **No linked/related business structure.**  
   clients table has no parent_client_id or similar field. Multiple businesses under one billing account cannot be linked.

9. **No payment or invoice locking on project setup.**  
   Projects are created without any payment confirmation step. No payment_status field on projects or clients.

10. **"Website Brief" copy template uses website-specific fields for all service types.**  
    buildWebsiteBrief in EnquiryDetailPage.tsx references website_goals, pages_needed, etc. For non-website services these fields will be empty or irrelevant.

11. **client_services records are NOT created during activation.**  
    handleActivate only creates a client + project. No client_services record is inserted to track what service is active.

12. **Activity log table not found via REST API.**  
    /admin/activity route exists but no activity_logs table was found. Data source unknown.

13. **Mailboxes have no domain_id field.**  
    mailboxes table only links to hosting_account_id, not to a specific domain. Cannot associate a mailbox with a domain.

14. **No password storage for mailboxes.**  
    No password field in mailboxes table.

15. **intake_submissions.project_id links are one-directional.**  
    Projects table has no intake_submission_id column. Cannot query "what enquiry created this project" from the projects table directly.

---

## 15. Recommended Fix Order

Based only on audit findings. Do not implement — for planning only.

### Phase 1: Data Model Cleanup
- Add intake_submission_id to projects table (bidirectional link)
- Add service_type to projects table (track actual service type)
- Confirm activity_logs table needs or find existing data source
- Add domain_id to mailboxes table
- Consider adding parent_client_id to clients for related business support
- Consider adding payment_status to clients or projects

### Phase 2: Activation Flow Cleanup
- Make handleActivate service-type aware — check service_type before creating project
- For non-project services: skip project creation, create client_services instead
- For project services: use correct project_type based on service_type
- Fix project_name template to reflect actual service
- Add duplicate client detection before INSERT (check by email or business_name)
- Create a client_services record on activation
- Add "Link to existing client" option on activation UI

### Phase 3: Hosting / Domain / Mailbox Management
- Make hosting account rows clickable — add /admin/hosting/:accountId route
- Create hosting account detail/edit page
- Add domain add/edit form
- Add mailbox create/edit form with domain linkage
- Add domain_id foreign key to mailboxes if missing at DB level

### Phase 4: Returning Client / Linked Business Flow
- Add existing client search/select on activation
- Add related business UI on client detail
- Add new service for existing client flow

### Phase 5: Invoice / Payment Locking
- Add payment_status to clients or projects
- Add payment confirmation step in activation
- Wire manual_invoices to client/project creation

### Phase 6: Automation Later
- Automate client_services creation
- WHM API integration for hosting provisioning
- Automated renewal reminders via renewal_actions
- WhatsApp bot intake via whatsapp_contacts table

---

## 16. Needs Verification

The following could not be confirmed from the codebase inspection:

- **Full enum values** for projects.stage and projects.progress_stage
- **ActivityLog.tsx data source** — no activity_logs table found, page purpose unclear
- **Domain and hosting add/edit UI** — may exist in components not reviewed
- **Intake form write path and RLS** — public form + RLS not confirmed
- **Admin RLS enforcement** on external Supabase tables (clients, projects, etc.)
- **Edge function full name and purpose** — supabase/functions/send-client-... truncated
- **project_services table** — exists, empty, purpose not confirmed
- **client_actions table** — exists, empty, purpose not confirmed
- **Whether DbContact / contacts table** is actively used or a legacy type
- **How zoho_customer_id on clients is populated** and whether Zoho sync is automated
- **Full migration file contents** for external Supabase tables
- **Whether intake_submissions.status can be "rejected"** or if it stays "icebox" and only the modal shows rejected state
- **Whether admin can edit intake fields** before activation
- **Whether hosting records are manually entered or synced from WHM**
