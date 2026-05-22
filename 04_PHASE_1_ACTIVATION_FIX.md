# 04_PHASE_1_ACTIVATION_FIX

**Date:** 22 May 2026
**Source:** 03_CLEANUP_PRIORITY_MAP.md (22 May 2026) → 02_CURRENT_SYSTEM_AUDIT.md (21 May 2026)
**Project:** Koca Bean Command Centre — kocabeanofficial-desktop/koca-bean-hub
**Purpose:** Codex-ready implementation brief for Phase 1 only. No code changes here. No migrations here. Precise requirements only, derived from confirmed audit findings.

> **Scope:** Fix enquiry activation so it is service-type aware, always creates a `client_services` record, only creates a project when the service type requires one, detects possible duplicate clients, and shows the admin an activation confirmation summary before any database writes occur.

---

## 1. Problem Statement

### Current Bug

The `handleActivate` function in `src/components/enquiries/EnquiryDetailPage.tsx` contains a single hardwired path that is always executed regardless of what the enquiry actually requested. The specific defects, confirmed in the audit, are:

**1. `project_type` is hardcoded to `"website_build"`**
The line `project_type: "website_build"` is written directly into the INSERT payload. The field `intake_submissions.service_type` is available in the enquiry object but is never read.

**2. A project is always created**
The projects INSERT runs unconditionally. Clients signing up for email-only, hosting, domain registration, or other non-project services get a spurious `"website_build"` project created against their record.

**3. Project name is always `"Website - [business_name]"`**
The `project_name` string is hardcoded to start with "Website - " regardless of service.

**4. `client_services` is never created**
The activation flow inserts into `clients` and `projects` but never inserts into `client_services`. As a result, active service subscriptions are invisible to the system. The `task_templates` table is keyed by `service_code` — without a `client_services` record, task automation can never trigger.

**5. No duplicate client detection**
There is no check for an existing client with the same email address or business name before the INSERT into `clients`. Activating two enquiries from the same business creates two separate client records silently.

**6. Activation writes to the database immediately on button press**
The "Activate Client" button triggers database writes directly with no confirmation step. The admin cannot review what will be created, cannot catch errors, and cannot choose to link an enquiry to an existing client instead.

### Impact Summary

| Affected Area | Current Symptom |
|---|---|
| Enquiries | Every activation produces the wrong record type for non-website services |
| Clients | Duplicate client records accumulate silently |
| Services | `client_services` is always empty — services are untracked |
| Projects | Projects exist for clients who never needed one |
| Task automation | Cannot trigger — no `client_services` records to key on |
| Admin trust | No review step means mistakes are instant and unrecoverable |

---

## 2. Files To Inspect First

Codex must read and understand these files before writing any code.

### Primary Target

| File | Why |
|---|---|
| `src/components/enquiries/EnquiryDetailPage.tsx` | Contains `handleActivate` — the function being replaced. Read the full function, all imports it uses, and all state variables it references. |

### Type Definitions

| File | Why |
|---|---|
| `src/types/database.ts` | Contains `DbClient`, `DbProject`, `DbIntakeSubmission`, `DbClientService`, `DbMailbox`, `DbHostingAccount`, `DbDomain` — all type shapes for INSERT payloads |
| `src/integrations/supabase/types.ts` | Lovable-managed Supabase types (separate project — distinguish from external project types) |
| `src/integrations/supabase/client.ts` | Supabase client instance — confirm which project it points to (`yxccaoiznqklgnxdsdlr.supabase.co`) |

### Routing

| File | Why |
|---|---|
| `src/App.tsx` | Confirm admin routes — specifically: confirm no `/admin/enquiries/:id` route exists as a separate page; confirm `EnquiryDetailPage` is rendered inline inside `Enquiries.tsx` |

### Enquiry List Page

| File | Why |
|---|---|
| `src/pages/admin/Enquiries.tsx` | Understand how `EnquiryDetailPage` is mounted, what props it receives, how the enquiry object is passed, and how the parent re-fetches after activation |

### Existing `client_services` Usage

| Search target | Why |
|---|---|
| Search codebase for `client_services` | Confirm no existing INSERT, UPDATE, or SELECT on `client_services` exists anywhere — so Phase 1 is the first code to touch this table |
| Search codebase for `service_code` | Confirm how `client_services.service_code` is expected to be populated |

### Existing Project Creation

| Search target | Why |
|---|---|
| Search for `project_type` | Find every location where project_type is set — confirm `"website_build"` hardcode is in `handleActivate` only |
| Search for `projects` INSERT | Confirm no other activation path creates projects |

### Migrations

| Path | Why |
|---|---|
| `supabase/migrations/` (all 18 files) | Confirm current column set on `projects` — specifically whether `intake_submission_id` and `service_type` columns already exist or need to be added. Confirm `client_services` columns. Confirm whether `activity_logs` table exists. |

### Services Lookup

| Table | Why |
|---|---|
| Query `services` table | Confirm which `service_code` / `code` values currently exist — these are the valid values for `client_services.service_code` |

---

## 3. Service Type Decision Table

This table defines what Phase 1 activation creates for each `service_type` value. Codex must implement branching logic that matches this table exactly.

The `service_type` value comes from `intake_submissions.service_type`.

### Project Services — create a project

| service_type | Label | creates_client | creates_client_service | creates_project | project_type | project_name template |
|---|---|---|---|---|---|---|
| `website_build` | New Website Build | yes | yes | yes | `website_build` | `Website Build — [business_name]` |
| `website_redesign` | Website Redesign | yes | yes | yes | `website_redesign` | `Website Redesign — [business_name]` |
| `ecommerce_build` | E-Commerce Build | yes | yes | yes | `ecommerce_build` | `E-Commerce Build — [business_name]` |
| `booking_system` | Booking System | yes | yes | yes | `booking_system` | `Booking System — [business_name]` |
| `custom_web_app` | Custom Web App | yes | yes | yes | `custom_web_app` | `Custom Web App — [business_name]` |

### Non-Project Services — do NOT create a project

| service_type | Label | creates_client | creates_client_service | creates_project | creates_domain | creates_hosting_account | creates_mailboxes |
|---|---|---|---|---|---|---|---|
| `hosting_email` | Hosting + Email Setup | yes | yes | **no** | no | no | no |
| `email_only` | Email Only | yes | yes | **no** | no | no | no |
| `domain_only` | Domain Registration Only | yes | yes | **no** | no | no | no |
| `domain_transfer` | Domain Transfer | yes | yes | **no** | no | no | no |
| `hosting_transfer` | Hosting Transfer | yes | yes | **no** | no | no | no |
| `support_request` | Support Request | yes | yes | **no** | no | no | no |
| `billing_request` | Billing / Invoice Request | yes | yes | **no** | no | no | no |
| `renewal_request` | Renewal Request | yes | yes | **no** | no | no | no |
| `existing_client_add_service` | Existing Client — Add Service | yes | yes | **no** | no | no | no |
| `general_enquiry` | General Enquiry | yes | yes | **no** | no | no | no |

### Fallback Rule

If `intake_submissions.service_type` is `null`, empty, or does not match any value in the table above, the activation logic must:

1. Treat it as a **non-project service** (safe default — do not create a project)
2. Set `client_services.service_code` to `"general_enquiry"`
3. Display a visible warning in the confirmation panel: **"Service type not recognised — no project will be created. Please confirm this is correct."**

Do not silently fall back to `"website_build"`. That is the current bug.

### Fields Not Populated by Phase 1 Activation

The following records are NOT created during Phase 1 activation regardless of service type. They require separate Phase 2/3 UI flows:

- `domains` — no domain record created on activation
- `hosting_accounts` — no hosting account created on activation
- `mailboxes` — no mailbox record created on activation

---

## 4. Required Database Checks

Before writing any activation logic, Codex must run the following checks against the actual database schema. Do this by reading migration files and/or querying the live Supabase REST API.

### Check 1: `projects` table columns

Confirm whether these columns exist:

| Column | Expected type | Status |
|---|---|---|
| `intake_submission_id` | UUID, nullable FK → `intake_submissions.id` | **Not confirmed — may be missing** |
| `service_type` | text, nullable | **Not confirmed — may be missing** |

**If missing:** A migration is required before Phase 1 code can set these fields. Write the migration but do not apply it during the code review — apply it as a separate step.

**Safe migration (example only — Codex writes the actual migration):**
```sql
-- Add bidirectional link from project to its source enquiry
ALTER TABLE projects ADD COLUMN IF NOT EXISTS intake_submission_id UUID REFERENCES intake_submissions(id);
-- Add service type tracking on projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS service_type TEXT;
```

### Check 2: `client_services` table columns

Confirm current columns — audit found:
`id`, `client_id`, `service_code`, `is_active`, `source`, `status`, `billing_cycle`, `billing_amount`, `renewal_date`, `started_at`, `suspended_at`, `cancelled_at`, `cancellation_reason`, `notes`, `created_at`, `updated_at`

Confirm which fields are nullable so the Phase 1 INSERT only sets required fields and leaves optional fields null.

**Minimum required fields for Phase 1 INSERT:**

| Field | Value |
|---|---|
| `client_id` | newly created (or linked) client UUID |
| `service_code` | derived from `intake_submissions.service_type` |
| `is_active` | `true` |
| `source` | `"enquiry_activation"` |
| `status` | `"active"` |
| `started_at` | `now()` |

Leave `billing_cycle`, `billing_amount`, `renewal_date` null — these are set later.

### Check 3: `intake_submissions` fields used in activation

The following fields must be read from the enquiry object during activation:

`service_type`, `business_name`, `full_name`, `email`, `phone`, `industry`, `website_goals`, `existing_domain`, `domain_name`, `business_overview`, `client_id` (guard), `project_id` (guard), `status`, `id`

### Check 4: `clients` table columns

Confirm the minimum fields required for a safe INSERT. From the audit, confirmed fields include:
`business_name`, `trading_name`, `email`, `phone`, `industry`, `website_url`, `notes`, `status`

No new columns are being added to `clients` in Phase 1.

### Check 5: `activity_logs` table

Run: `GET /rest/v1/activity_logs?limit=1`

- If it returns a valid response (even empty): confirm column names and use this table for logging
- If it returns PGRST205 (relation not found): note this in the PR description and skip activity logging for Phase 1. Do not create a migration for it during Phase 1 — it is listed as a separate pre-Phase-1 check in `03_CLEANUP_PRIORITY_MAP.md`

### Check 6: `services` table contents

Run: `GET /rest/v1/services?select=code,name,category&order=code`

This confirms the valid `service_code` values that can be inserted into `client_services.service_code`. If a `service_code` matching the `service_type` does not exist in the `services` table, Codex must note this and either use the closest match or insert as a free-text value (if the FK constraint allows it).

---

## 5. Activation Behaviour

### A. New Client — Project Service (e.g. `website_build`, `ecommerce_build`)

**Trigger:** Admin presses "Review Activation" on an enquiry with a project-type `service_type` and no existing `client_id`.

**Step 1 — Duplicate check:**
Query `clients` for rows where `email = enq.email` OR `business_name = enq.business_name`. If matches are found, show them in the confirmation panel (see Section 7). Allow admin to proceed with new client or link to existing.

**Step 2 — Confirmation panel:**
Show summary (see Section 7). Admin must explicitly confirm before any writes occur.

**Step 3 — On confirm:**
1. INSERT into `clients` → capture returned `client_id`
2. INSERT into `client_services` with `client_id`, `service_code` = `service_type`, `is_active = true`, `source = "enquiry_activation"`, `status = "active"`, `started_at = now()`
3. INSERT into `projects` with `client_id`, correct `project_type`, correct `project_name`, `stage = "enquiry_received"`, `priority = "medium"`, `description` from intake, `intake_submission_id` = enquiry id (if column exists), `service_type` = enquiry service_type (if column exists)
4. UPDATE `intake_submissions` SET `status = "activated"`, `client_id` = new client UUID, `project_id` = new project UUID
5. Invalidate React Query caches: `intake_submissions`, `clients`, `projects`, `client_services`
6. Show success toast: "Client activated — [service label] service created"
7. Close confirmation panel

**Error handling:** If any INSERT fails, show error toast. Do not partially apply — if possible, wrap in a single database transaction or at minimum do not update `intake_submissions` unless clients + project + client_services all succeeded.

---

### B. New Client — Non-Project Service (e.g. `hosting_email`, `email_only`, `domain_only`)

**Trigger:** Admin presses "Review Activation" on an enquiry with a non-project `service_type` and no existing `client_id`.

**Step 1 — Duplicate check:** Same as A.

**Step 2 — Confirmation panel:**
Show summary. Include visible notice: **"No project will be created for this service type."**

**Step 3 — On confirm:**
1. INSERT into `clients` → capture returned `client_id`
2. INSERT into `client_services` (same as A, steps 1–2)
3. **Do NOT insert into `projects`**
4. UPDATE `intake_submissions` SET `status = "activated"`, `client_id` = new client UUID *(leave `project_id` null)*
5. Invalidate React Query caches: `intake_submissions`, `clients`, `client_services`
6. Show success toast: "Client activated — [service label] service created. No project created."
7. Close confirmation panel

---

### C. Existing Client — New Project Service

**Trigger:** Admin selects an existing client in the duplicate detection panel and the service type is a project service.

**Step 1:** Admin selects existing client from the matched results list.

**Step 2 — Confirmation panel:** Show the existing client card, the service being added, and that a new project will be created under the existing client.

**Step 3 — On confirm:**
1. **Do NOT insert into `clients`** — use selected existing `client_id`
2. INSERT into `client_services` using existing `client_id`
3. INSERT into `projects` using existing `client_id`
4. UPDATE `intake_submissions` SET `status = "activated"`, `client_id` = existing client UUID, `project_id` = new project UUID
5. Invalidate caches as above
6. Show success toast: "New project created for existing client — [client business name]"

---

### D. Existing Client — New Non-Project Service

**Trigger:** Admin selects an existing client in the duplicate detection panel and the service type is a non-project service.

**Step 3 — On confirm:**
1. **Do NOT insert into `clients`**
2. INSERT into `client_services` using existing `client_id`
3. **Do NOT insert into `projects`**
4. UPDATE `intake_submissions` SET `status = "activated"`, `client_id` = existing client UUID *(leave `project_id` null)*
5. Invalidate caches
6. Show success toast: "New service added to existing client — [client business name]"

---

### E. Already Activated Enquiry

**Trigger:** Admin opens an enquiry where `enq.client_id` is not null OR `enq.status === "activated"`.

**Behaviour:**
- The "Review Activation" button must not appear, or must be visually disabled and labelled "Already Activated"
- If clicked anyway, show toast: "This enquiry has already been activated"
- No database writes occur
- The existing guard condition in `handleActivate` covers this — keep it

---

## 6. Duplicate Client Detection

### Matching Rules

Phase 1 uses three match signals. All matching is case-insensitive, trimmed.

| Signal | Query | Match type |
|---|---|---|
| Email match | `clients.email = enq.email` (case-insensitive) | Strong match |
| Business name match | `clients.business_name ILIKE enq.business_name` | Strong match |
| Phone match | `clients.phone = enq.phone` (if both non-null) | Supporting match |

Run both email and business_name queries before showing the confirmation panel. A phone-only match is not shown as a duplicate — only used as a supporting signal if email or name also matches.

### What "Possible Match" Means

A "possible match" is flagged when at least one of: email match OR business_name match returns a result.

### UI Behaviour on Match Found

1. Do not block activation
2. In the confirmation panel (see Section 7), show a **"Possible Duplicate Clients"** section
3. For each matched client, show: business name, email, phone, date created, current status
4. Provide two options per match:
   - **"Link to this client"** — uses the existing client_id, skips new client creation
   - **"Ignore — Create New Client"** — proceeds with new client creation
5. Admin must explicitly select one option before the confirm button is enabled
6. If no matches are found, the "Possible Duplicate Clients" section is hidden and the confirm button is available immediately

### What Phase 1 Does NOT Do

- Does not auto-merge clients
- Does not delete or modify existing client records
- Does not block activation if admin explicitly chooses to create a new client
- Does not apply fuzzy/phonetic matching — exact and ILIKE only

---

## 7. Activation Confirmation Summary

### Panel Trigger

The "Activate Client" button is renamed **"Review Activation"**. When clicked, it:
1. Runs the duplicate client check
2. Opens the confirmation panel (modal or slide-over)
3. Does NOT write to the database yet

### Panel Contents

The confirmation panel must display all of the following before the admin can confirm:

---

**ACTIVATION SUMMARY**

**Business / Client**
- Business Name: `[enq.business_name]`
- Contact Name: `[enq.full_name]`
- Email: `[enq.email]`
- Phone: `[enq.phone]`

**Service**
- Service Type: `[enq.service_type]` → **[Human-readable label from table in Section 3]**

**What will be created:**
- [ ] New client record: **Yes / No (linking to existing)**
- [ ] Client service record: **Always Yes** — service: `[service_code]`
- [ ] New project: **Yes** (project services only) / **No** (non-project services)
  - If yes → Project name: `[derived project_name]`, Project type: `[project_type]`
  - If no → Show notice: *"No project will be created for this service type"*

**Possible Duplicate Clients** *(shown only if matches found)*
- [List of matched clients with "Link to this client" / "Ignore" options]
- If any match shown: confirm button disabled until admin selects an option

**Warning** *(shown only if service_type is unrecognised or null)*
> ⚠️ Service type not recognised — no project will be created. Please confirm this is correct.

---

**[Confirm Activation]** button — triggers database writes
**[Cancel]** button — closes panel, no writes

---

### Panel Placement

Rendered as a modal dialog or a drawer/slide-over panel within `EnquiryDetailPage`. It does not navigate away from the enquiry.

### State Management

Use local component state (React `useState`) to manage:
- `showConfirmPanel: boolean`
- `selectedExistingClientId: string | null`
- `duplicateMatches: DbClient[]`
- `isActivating: boolean` (replaces existing `converting` state)

---

## 8. Implementation Requirements

### What Must Change in `handleActivate`

The existing `handleActivate` function must be refactored. The replacement must:

1. **Remove** the line `project_type: "website_build"` — never hardcode this value
2. **Read** `service_type` from the enquiry object: `const serviceType = enq.service_type ?? "general_enquiry"`
3. **Normalise** `serviceType` safely: if the value is not in the known service type list, fall back to `"general_enquiry"` and surface the fallback warning in the UI — do not throw, do not block
4. **Determine** whether a project should be created: `const requiresProject = PROJECT_SERVICE_TYPES.includes(serviceType)`
5. **Determine** correct `project_type` and `project_name` from the service type map (see Section 3)
6. **Always INSERT** into `client_services` after client creation — this must not be optional
7. **Only INSERT** into `projects` if `requiresProject === true`
8. **Set `project_id`** in the `intake_submissions` UPDATE only if a project was created — otherwise leave it null
9. **Set `intake_submission_id`** on the new project row if that column exists (check first — see Section 4)
10. **Set `service_type`** on the new project row if that column exists (check first — see Section 4)
11. **Preserve** the existing re-activation guard: `if (enq.client_id || enq.project_id)` — keep this check
12. **Move database writes** out of `handleActivate` and into a new `handleConfirmActivation` function that is called only after admin confirms in the panel
13. **Keep RLS** intact — all writes use the authenticated Supabase client session. Do not use service role key in the frontend

### New Function: `handleReviewActivation`

Replaces the direct trigger on "Activate Client" button.

Responsibilities:
- Validate guard conditions (already activated)
- Query for duplicate clients
- Set component state: `duplicateMatches`, `showConfirmPanel = true`
- Does NOT write to database

### New Function: `handleConfirmActivation`

Called when admin clicks "Confirm Activation" in the panel.

Responsibilities:
- Read `selectedExistingClientId` — if set, skip client INSERT
- Execute the correct database writes based on service type (see Section 5)
- Handle errors — show toast on failure
- On success: close panel, invalidate caches, show success toast

### TypeScript Requirements

- Define a `SERVICE_TYPE_CONFIG` constant (or equivalent) that maps each `service_type` string to: `{ label, requiresProject, projectType?, projectNameTemplate? }`
- This config must be the single source of truth — no inline string checks like `if (serviceType === "website_build")` scattered through the component
- All new state variables must be typed — no `any`
- The existing `DbIntakeSubmission`, `DbClient`, `DbProject`, `DbClientService` types from `database.ts` must be used for all INSERT payloads

### Query Invalidation

After successful activation, invalidate:
- `["intake_submissions"]`
- `["clients"]`
- `["projects"]`
- `["client_services"]`

---

## 9. UI Copy Changes

### Button Rename

| Current label | New label | When shown |
|---|---|---|
| "Activate Client" | "Review Activation" | Enquiry not yet activated |
| "Activate Client" (disabled) | "Already Activated" | Enquiry already has `client_id` |

### Section Heading in Enquiry Detail

| Service type | Section heading |
|---|---|
| Any project service (`website_build`, etc.) | "Website Brief" or "Original Intake Brief" (existing behaviour preserved) |
| Any non-project service | "Original Submission" |
| Unknown / null service_type | "Original Submission" |

### Toast Messages

| Event | Toast message |
|---|---|
| Activation success — new project service | "Client activated — [Service Label] project created" |
| Activation success — non-project service | "Client activated — [Service Label] service created. No project created." |
| Activation success — existing client linked | "Service added to existing client — [business name]" |
| Already activated | "This enquiry has already been activated" |
| Activation error | "Activation failed — [error message]. Please try again." |
| Unknown service type fallback used | "Warning: service type not recognised — activated as General Enquiry" |

### Confirmation Panel Labels

- "Confirm Activation" — primary action button
- "Cancel" — secondary action button
- "Link to this client" — duplicate resolution option
- "Ignore — Create New Client" — duplicate resolution option
- "No project will be created for this service type" — non-project notice

---

## 10. Acceptance Criteria

All of the following must be true before Phase 1 is considered complete.

### Functional

- [ ] Activating a `hosting_email` enquiry creates a `clients` record and a `client_services` record. No `projects` record is created.
- [ ] Activating an `email_only` enquiry creates a `clients` record and a `client_services` record. No `projects` record is created.
- [ ] Activating a `domain_only` enquiry creates a `clients` record and a `client_services` record. No `projects` record is created.
- [ ] Activating a `website_build` enquiry creates a `clients` record, a `client_services` record, and a `projects` record with `project_type = "website_build"` and `project_name = "Website Build — [business_name]"`.
- [ ] Activating an `ecommerce_build` enquiry creates a project with `project_type = "ecommerce_build"` and `project_name = "E-Commerce Build — [business_name]"`.
- [ ] Every successful activation creates exactly one `client_services` record regardless of service type.
- [ ] The activation button opens a confirmation panel before writing to the database.
- [ ] If a client with the same email exists, the confirmation panel shows the match and requires admin to choose before the confirm button is enabled.
- [ ] An already-activated enquiry (`client_id` not null) cannot be activated again — the button is disabled or absent.
- [ ] Linking to an existing client on activation does not create a new `clients` record.
- [ ] A null or unrecognised `service_type` falls back to `"general_enquiry"`, creates no project, and shows a warning in the confirmation panel.

### Technical

- [ ] TypeScript build passes with no type errors introduced by Phase 1 changes
- [ ] No `any` type used in new code
- [ ] `SERVICE_TYPE_CONFIG` (or equivalent) is the single source of truth for service-to-project mapping
- [ ] No RLS policies are weakened or bypassed
- [ ] No service role key is used in the frontend
- [ ] React Query cache invalidation runs after every successful activation
- [ ] All database writes in `handleConfirmActivation` are guarded by error handling with user-visible failure toasts

### Regression

- [ ] Existing activated enquiries (those with `client_id` set) display correctly and are not affected
- [ ] Status change (contacted, icebox, rejected) still works on enquiries
- [ ] Enquiry list page loads and filters correctly
- [ ] No existing copy functions (`buildWebsiteBrief`, `buildInvoiceCopy`, `buildZohoCustomerCopy`) are broken

---

## 11. Out of Scope

The following are explicitly excluded from Phase 1. Do not implement, do not plan for, do not reference in Phase 1 code.

| Item | Phase |
|---|---|
| Hosting detail/edit page (`/admin/hosting/:accountId`) | Phase 2 |
| Clickable hosting rows | Phase 2 |
| Domain add/edit form | Phase 2 |
| Mailbox management UI | Phase 2 |
| `domain_id` on mailboxes migration | Phase 2 |
| Returning client search UI (Phase 3 flow) | Phase 3 |
| `parent_client_id` / linked business schema | Phase 3 |
| "Add new service" on Client Detail page | Phase 3 |
| Invoice/payment confirmation step | Phase 5 |
| cPanel / WHM API automation | Future |
| Zoho API automation | Future |
| Domain registrar API | Future |
| AI agent / WhatsApp bot automation | Future |
| Task auto-generation via `task_templates` | Future |
| Full accounting sync | Future |
| Activity logging on all CRUD operations | Future (pending activity_logs confirmation) |
| Client portal (`/client/...`) changes | Future |
| SEO tracking or reports changes | Future |
