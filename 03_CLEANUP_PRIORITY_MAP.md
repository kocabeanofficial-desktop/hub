# 03_CLEANUP_PRIORITY_MAP

**Date:** 22 May 2026
**Source:** 02_CURRENT_SYSTEM_AUDIT.md (audited 21 May 2026)
**Project:** Koca Bean Command Centre — kocabeanofficial-desktop/koca-bean-hub
**Purpose:** Convert audit findings into a practical, prioritised cleanup map. No code changes. No speculation. Confirmed findings only.

---

## 1. Executive Summary

The Koca Bean Command Centre is a partially built admin dashboard for managing web design clients, hosting accounts, domains, and email services. The foundation is in place: a Supabase database with the right tables, a React/Lovable frontend, and a working enquiry intake flow.

However, the activation flow — the core process that turns an enquiry into a client record — is currently hardwired for a single service type (website build). The system has no awareness of the other services Koca Bean actually sells: hosting-only, email-only, domain registration, and combinations thereof. Every enquiry, regardless of what was requested, creates a "website_build" project. No service subscription record is created. No payment confirmation exists. No duplicate detection exists.

The hosting module is display-only: 64 accounts are visible but none are clickable or editable. Mailboxes are tracked in the database (0 rows) but there is no UI to create or manage them. Returning clients, linked businesses, and multi-service clients have no supported workflow.

The system works as a read-only record store and enquiry viewer. It does not yet work as an operational command centre.

---

## 2. Biggest Structural Problem

**The activation flow is a single-path, hardcoded pipeline that assumes every client is a website build client.**

This is the root cause of most downstream problems. The `handleActivate` function in `EnquiryDetailPage.tsx`:

- Ignores `intake_submissions.service_type` entirely
- Always creates a project with `project_type: "website_build"`
- Always names the project `"Website - [business_name]"`
- Never creates a `client_services` record
- Never checks whether a client with the same email or business name already exists
- Never asks the admin to confirm what is being created before committing to the database

**Why this affects every module:**

- **Enquiries:** Every activation produces the wrong record type for non-website services
- **Clients:** Duplicate client records accumulate with no warning
- **Services:** `client_services` is never populated — active services cannot be tracked
- **Projects:** Projects exist for clients who never needed a project (email/hosting/domain only)
- **Hosting:** Cannot be linked to a service record; no management UI exists
- **Future automation:** Task templates (`task_templates`) are keyed by `service_code` — if `client_services` is never created, task automation cannot trigger

Until this is fixed, every other improvement builds on a broken foundation.

---

## 3. Confirmed Critical Issues

| # | Issue | Where Found | Why It Matters | Risk | Phase |
|---|-------|------------|----------------|------|-------|
| 1 | Activation hardcodes `project_type: "website_build"` | `EnquiryDetailPage.tsx` handleActivate | Wrong project type created for every non-website enquiry | Critical | 2 |
| 2 | Activation always creates a project — even for email/hosting/domain-only services | `EnquiryDetailPage.tsx` handleActivate | Projects pollute the database for clients who do not have projects | Critical | 2 |
| 3 | `client_services` never created during activation | `EnquiryDetailPage.tsx` handleActivate | Active service subscriptions are invisible; task automation cannot trigger | Critical | 2 |
| 4 | No duplicate client detection | `EnquiryDetailPage.tsx` handleActivate | Two enquiries from the same business create two client records | Critical | 2 |
| 5 | `intake_submissions.service_type` is collected but never used | intake form + handleActivate | Service intent is captured but immediately discarded; all logic is blind to it | Critical | 2 |
| 6 | No returning client flow | Entire activation path | Existing clients adding new services must be manually de-duplicated after the fact | High | 4 |
| 7 | Hosting account rows are not clickable and there is no detail or edit page | `Hosting.tsx` (no onClick on tr); no /admin/hosting/:accountId route | 64 accounts are visible but none can be managed from the dashboard | High | 3 |
| 8 | Mailboxes table is empty and there is no mailbox creation or edit UI | DB (0 rows); no form found in codebase | Email accounts cannot be tracked or managed in the system | High | 3 |
| 9 | No payment or invoice locking on project/service setup | Entire codebase; no `payment_status` on clients or projects | Setup can proceed without payment being confirmed | High | 5 |
| 10 | Activity log table not found via REST API | DB query returned PGRST205 for activity_logs | `/admin/activity` page data source is unknown; audit trail is unclear | High | 1 |
| 11 | Project name is always `"Website - [business_name]"` | `EnquiryDetailPage.tsx` handleActivate | Misleading project names for all non-website services | Medium | 2 |
| 12 | `buildWebsiteBrief` uses website-specific fields for all service types | `EnquiryDetailPage.tsx` | Brief copy is irrelevant for email/hosting/domain enquiries | Medium | 2 |
| 13 | `projects` table has no `intake_submission_id` column | DB schema (confirmed via API) | Cannot query "what enquiry created this project" from the project side | Medium | 1 |
| 14 | No linked/related business structure in `clients` table | DB schema — no parent_client_id | Multiple businesses under one billing account cannot be linked | Medium | 4 |
| 15 | Mailboxes have no `domain_id` — only linked to `hosting_account_id` | `DbMailbox` type in database.ts | Cannot associate a specific mailbox with a specific domain | Medium | 3 |
| 16 | No confirmation/review screen before activation commits | `EnquiryDetailPage.tsx` | Admin cannot review what will be created before pressing Activate | Medium | 2 |
| 17 | No password storage on mailboxes | `mailboxes` table schema | Mailbox credentials cannot be stored or retrieved from the dashboard | Low | 3 |
| 18 | `client_services` not linked to `projects`, `domains`, `hosting_accounts`, or `mailboxes` | DB schema | Cannot determine which service a project, domain, or mailbox belongs to | Low | 1 |

---

## 4. Data Model Gaps

**clients**
- No `parent_client_id` or related business linkage
- No `payment_status` field
- `lifecycle_notes` is a free text field with no structure

**intake_submissions**
- `service_type` collected but never acted on in activation
- No validation preventing re-activation after `client_id` / `project_id` are set (guard is code-only)
- Bidirectional link to projects is missing (project does not know its source enquiry)

**projects**
- No `intake_submission_id` column (link is one-directional from `intake_submissions` side only)
- No `service_type` column (cannot query "all hosting projects" etc.)
- `project_type` is always stored as `"website_build"` regardless of actual service
- `progress_stage` field exists alongside `stage` — purpose and relationship between the two not confirmed

**client_services**
- Never populated by any confirmed code path
- Not linked to `projects`, `domains`, `hosting_accounts`, or `mailboxes` by foreign key
- Holds billing fields (`billing_amount`, `billing_cycle`, `renewal_date`) that cannot be used without records

**hosting_accounts**
- No edit UI confirmed
- Not linked to `client_services` by foreign key
- Admin cannot manage these records from the dashboard

**domains**
- No add/edit UI confirmed (appears read-only)
- Not linked to `client_services`
- No domain availability checking

**mailboxes**
- Currently 0 rows — never populated
- No `domain_id` field (cannot link mailbox to a domain)
- No password field
- No creation UI confirmed

**invoices / payments**
- `renewal_invoices` exists for renewals only
- `manual_invoices` exists in Lovable-managed Supabase (separate project, 0 rows)
- No `payments` table found
- No `payment_status` on `clients` or `projects`
- No invoice-to-client-service linkage

**activity logs**
- No `activity_logs` table found via REST API
- `ActivityLog` page exists but data source is unconfirmed
- `whm_api_log` exists but is empty
- No structured logging on CRUD operations confirmed

**linked businesses / related clients**
- No structure for this exists anywhere in the schema
- No `parent_client_id`, no `business_groups`, no `account_hierarchy` table

---

## 5. UI/UX Gaps

**Enquiry Detail (`EnquiryDetailPage.tsx`)**
- No edit form for intake fields before activation
- No review/confirmation screen before Activate Client commits
- "Activate Client" button triggers immediate database writes
- Brief copy and Zoho templates use website-specific wording for all service types
- No "Link to existing client" option on activation

**Client Detail (`/admin/clients/:clientId`)**
- No confirmed "Add new service" action
- No linked business view or creation
- No payment status indicator
- notes and lifecycle_notes are text fields — no structured history

**Project Detail (`/admin/projects/:projectId`)**
- Route exists; whether a dedicated component renders for it is not confirmed
- No confirmed link back to the source enquiry
- `progress_stage` vs `stage` fields — purpose of dual staging fields unclear in UI

**Hosting List (`/admin/hosting`)**
- Rows are not clickable — 64 accounts are visible but untouchable
- No search, sort, or filter controls confirmed
- No inline edit capability

**Hosting Detail (missing)**
- No `/admin/hosting/:accountId` route exists
- No hosting account edit form
- No per-account domain list
- No per-account mailbox list
- No per-account setup checklist or notes

**Mailbox Management (missing)**
- No add mailbox UI
- No edit mailbox UI
- No view of mailbox credentials or status
- Mailbox table is entirely empty — the system cannot track email accounts at all currently

**Returning Client Flow (missing)**
- No search for existing client during activation
- No "this is a returning client" path anywhere in the UI
- No "add service to existing client" flow in the enquiry detail

**Activation Confirmation (missing)**
- No summary screen showing what will be created before committing
- No diff of existing vs. new record for duplicate detection
- No rollback / undo if activation created the wrong record type

---

## 6. Workflow Gaps

**New website client**
Partial support. Activation creates a client and a project. However `client_services` is not created, project type is hardcoded, and no payment confirmation exists. The core path exists but is incomplete.

**New hosting / email client**
Not supported. Activation still creates a `"website_build"` project. No hosting-only or email-only activation path exists. No `client_services` record is created.

**Existing client adds service**
Not supported. There is no UI to link a new enquiry to an existing client. Every activation creates a fresh client record, risking duplicates.

**Existing client adds a linked business**
Not supported. No parent/child client structure exists in the schema or UI.

**Domain-only request**
Not supported as a distinct flow. Activation still creates a project. Domains are tracked in the `domains` table but cannot be created or edited from the dashboard.

**Email-only request**
Not supported. Activation creates a `"website_build"` project. Mailboxes cannot be created from the dashboard at all. The `mailboxes` table is empty.

**Support / change request**
`support_tickets` table exists (0 rows). `/admin/support` page exists. Full support workflow not confirmed as operational.

**Invoice / payment before setup**
Not supported as a workflow gate. Activation creates records immediately without any payment confirmation step.

---

## 7. Security / RLS Concerns

- The `sb_publishable_` anon-equivalent key is embedded in `src/integrations/supabase/client.ts` and is therefore visible in the compiled frontend bundle. This is standard practice for Supabase public keys, but all sensitive operations must be protected by RLS policies on the database side — not by key secrecy.
- `client_invites` RLS policy uses `USING (true) WITH CHECK (true)` for all authenticated users. This means any authenticated user can read, insert, update, and delete any invite record. If admin and client roles share the same auth pool, this policy is overly broad.
- `ProtectedRoute` in `App.tsx` enforces role-based access at the frontend routing level. This must be backed by matching RLS policies on the database — frontend-only role enforcement is not sufficient.
- Full RLS policy details for external Supabase tables (clients, projects, hosting_accounts, domains, etc.) could not be read without a service role key. These must be verified directly in the Supabase dashboard.
- The public intake form write path (intake_submissions) and its RLS policy have not been confirmed. If RLS on `intake_submissions` is not restricted, unauthenticated users could write arbitrary records.
- The edge function name was truncated in the Lovable UI (`send-client-...`). Its full name, trigger conditions, and any sensitive data it transmits have not been confirmed.
- `admin_users` table stores role information. If RLS on this table allows client-role authenticated users to read it, role escalation could be possible.
- Items that must remain admin-only: `clients`, `projects`, `hosting_accounts`, `domains`, `mailboxes`, `client_services`, `admin_users`, `renewal_invoices`, `activity_logs` (if it exists), `whm_api_log`.

---

## 8. Clean Fix Order

1. **Confirm activity log table** — find or create `activity_logs`; confirm what `ActivityLog.tsx` reads
2. **Add `intake_submission_id` to `projects`** — make the enquiry→project link bidirectional
3. **Add `service_type` to `projects`** — so projects can be queried by service type
4. **Add `domain_id` to `mailboxes`** — link mailboxes to their domain
5. **Fix activation: make it service-type aware** — read `service_type` from the enquiry; branch accordingly
6. **Fix activation: make project creation conditional** — only create a project for project-type services
7. **Fix activation: use correct `project_type` and `project_name`** — derive from actual `service_type`
8. **Fix activation: create `client_services` record** — always, for every activated client
9. **Add duplicate client detection** — check by email or business_name before INSERT
10. **Add activation confirmation/review screen** — show the admin what will be created before committing
11. **Add "link to existing client" option** — allow activation to attach a new service to an existing client
12. **Make hosting rows clickable** — add `onClick` to `<tr>` in `Hosting.tsx`
13. **Add `/admin/hosting/:accountId` route and detail page** — with edit form, domain list, mailbox list
14. **Add domain add/edit form** — currently read-only
15. **Add mailbox create/edit form** — currently entirely missing
16. **Add returning client / linked business UI** — on client detail page
17. **Add payment/invoice confirmation step in activation** — gate setup on payment status
18. **Add activity logging** — on CRUD operations for clients, projects, hosting, domains, mailboxes
19. **Clean labels and copy templates** — service-type-aware wording throughout

---

## 9. What Not To Fix Yet

The following should wait until the activation flow, service model, and hosting management are stable:

- **cPanel / WHM API automation** — provisioning hosting accounts automatically. The `whm_api_log` and `whm_quota_checks` tables exist but are empty. Build the manual management UI first.
- **Zoho API automation** — `zoho_customers_raw` and `zoho_invoices_raw` tables exist but are empty. The copy-to-clipboard approach works for now.
- **Domain registrar API** — no domain availability checking or automated registration. Build the manual domain add/edit flow first.
- **Advanced client portal features** — client-facing routes (`/client/...`) exist but client portal completeness is not confirmed. Admin side must work first.
- **AI agent / WhatsApp bot automation** — `whatsapp_contacts` and `bot_settings` tables exist. Do not build automation on top of an incomplete data model.
- **Full accounting sync** — Zoho sync, payment reconciliation, and billing automation should follow a working manual invoice flow.
- **Task automation via `task_templates`** — `task_templates` is keyed by `service_code`. Tasks cannot auto-generate until `client_services` is reliably populated.
- **Reporting and SEO tracking** — `/admin/reports` and `/admin/seo` pages exist. These are analytics layers that depend on clean underlying data.

---

## 10. Recommended Phase 1 Scope

**Theme: Fix the activation foundation.**

The smallest safe first implementation that unblocks everything downstream:

- Remove hardcoded `project_type: "website_build"` from `handleActivate`
- Read `service_type` from the enquiry and branch activation logic accordingly
- Make project creation conditional — only create a project if the service type requires one
- Use the correct `project_type` and `project_name` based on actual `service_type`
- Always create a `client_services` record on activation (for every service type)
- Prevent re-activation guard remains as-is (already in place)
- Add basic duplicate client detection by `email` before inserting a new client
- Add an activation confirmation summary screen — show admin: client name, service type, whether a project will be created, what `client_services` record will be inserted — before any database writes occur

**Data model changes required for Phase 1:**
- Add `intake_submission_id` column to `projects` table (migration)
- Add `service_type` column to `projects` table (migration)
- Confirm or create `activity_logs` table (migration if needed)

**Out of scope for Phase 1:**
- Returning client flow
- Hosting detail page
- Mailbox UI
- Payment locking

---

## 11. Recommended Phase 2 Scope

**Theme: Make hosting management operational.**

Currently 64 hosting accounts are visible but none can be managed. This phase makes the hosting module functional:

- Add `onClick` handler to hosting account rows in `Hosting.tsx`
- Create `/admin/hosting/:accountId` route
- Create `HostingDetail.tsx` page with:
  - Hosting account fields (read and edit)
  - Domain list for this account (read, with add/edit)
  - Mailbox list for this account (read, with add/edit)
  - Setup checklist (manual completion markers for: DNS configured, SSL active, cPanel created, email configured)
  - Internal notes field
- Add domain add/edit form (inline or modal)
- Add mailbox create/edit form (inline or modal)
- Add `domain_id` to `mailboxes` if not already present (migration)

**Out of scope for Phase 2:**
- WHM API automation
- Domain registrar API
- Returning client flow

---

## 12. Recommended Phase 3 Scope

**Theme: Returning clients and linked businesses.**

After Phase 1 (clean activation) and Phase 2 (hosting management), the system needs to support clients who already exist:

- Add "search for existing client" step in the enquiry activation flow
  - If match found: show existing client card; allow admin to choose "Add service to this client" or "Create new client"
  - If no match: proceed with new client creation (Phase 1 flow)
- Add "Add new service" action on Client Detail page (`ClientDetail.tsx`)
  - Triggers a mini activation flow for the service only (no new client created)
  - Always creates a `client_services` record
  - Conditionally creates a project based on service type
- Add related/linked business support:
  - Add `parent_client_id` (nullable FK to `clients.id`) migration — needs human decision first (see Section 13)
  - Add linked businesses section on Client Detail page
  - Allow billing to be grouped under a parent client

---

## 13. Open Questions

The following require a human decision before coding begins:

1. **What services does Koca Bean actually sell?** A definitive list of `service_type` values (e.g. `website_build`, `hosting_only`, `email_only`, `domain_registration`, `seo`, `combo`) is needed to correctly branch the activation flow in Phase 1. The `services` table exists but its current contents have not been confirmed.

2. **Which services require a project, and which do not?** For example: does a hosting-only client get a project? Does a domain-only client? This list must be agreed before conditional project creation logic is written.

3. **What should happen if a duplicate client is detected?** Options: (a) block activation and show a warning, (b) show a "link to existing client" prompt, (c) create anyway and flag for review. This is a policy decision.

4. **Should linked businesses be a parent/child client structure, or a separate `business_groups` table?** The chosen model affects the schema migration and the UI significantly.

5. **Should mailbox passwords be stored in the database?** If yes, what encryption or vault approach should be used? This must be decided before the mailbox management UI is built.

6. **What is the source of truth for hosting account records?** Are these manually entered by admin, or should they eventually sync from WHM/cPanel? The answer affects whether an edit form is sufficient or whether a sync mechanism is also required.

7. **What is the payment flow?** Is a Zoho invoice number required before setup can proceed? Is the payment confirmation a checkbox ("I confirm payment received"), an uploaded invoice, or an external Zoho status check?

8. **What is the `ActivityLog.tsx` page currently reading?** The `activity_logs` table was not found via REST API (PGRST205). Is the page reading from a different table, or is it broken? This must be confirmed before Phase 1 migrations alter the schema.

9. **What are the valid values for `projects.stage` and `projects.progress_stage`?** Both fields exist. Their full enum values and the difference between them was not confirmed in the audit. These need to be documented before the project creation logic is corrected.

10. **Is the intake form public or authenticated?** The write path for `intake_submissions` and its RLS policy were not confirmed. If public submissions are expected, the RLS policy must allow unauthenticated inserts safely while preventing unauthenticated reads.
