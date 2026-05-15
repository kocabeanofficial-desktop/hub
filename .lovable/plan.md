## Goal

Make the "Send Invite" button create the client auth user and `client_invites` row in the **external Koca Supabase project** (`yxccaoiznqklgnxdsdlr`) instead of Lovable Cloud, using the newly added `EXTERNAL_SUPABASE_SERVICE_ROLE_KEY`. Keep all admin checks strict.

## Root cause of current failure

`supabase/functions/send-client-invite/index.ts` uses two clients:
- `externalClient` / `lookupClient` → external project (admin verification only)
- `supabaseAdmin` (built from `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`) → **Lovable Cloud**, used for `auth.admin.createUser`, `client_invites` insert, and accept/validate flows.

Result: auth users are created in Lovable Cloud (where the admin doesn't exist) and `client_invites.invited_by` FK points at Lovable Cloud `auth.users`. Hence the FK violation we patched with `null`, and invites that don't actually land in the external project where the rest of the business data lives.

## Changes

### 1. `supabase/functions/send-client-invite/index.ts`

- Add a single `externalAdmin` client built from:
  ```ts
  createClient(EXTERNAL_SUPABASE_URL, Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } })
  ```
  Fail fast with a 500 + clear log if the env var is missing.
- Replace **all** uses of `supabaseAdmin` with `externalAdmin` for:
  - `validate` action: `client_invites` lookup
  - `accept` action: `client_invites` lookup, `auth.admin.listUsers` / `updateUserById` / `createUser`, `client_invites` update
  - `send` action: `auth.admin.createUser` (with `user_metadata.client_id`), `client_invites` insert
- In the `send` branch, use `invited_by: invited_by_user_id || null`. Since the caller's verified admin id (`userRes.user.id`) now belongs to the external project, refactor `requireAdminCaller` to also **return** the verified admin user id and use it as `invited_by` instead of `null`.
- Remove the Lovable Cloud `supabaseAdmin` entirely. No more `Deno.env.get("SUPABASE_URL")` / `SUPABASE_SERVICE_ROLE_KEY` usage in this function.
- Keep admin verification exactly as today: bearer token required, `admin_users` row must exist, `is_active === true`, `role === "super_admin"`.
- Keep server-side password validation, CORS, and generic error messages on the wire (detailed logs server-side).

### 2. `src/pages/admin/Clients.tsx`

- `handleSendInvite` already surfaces `data?.error || fnError?.message`. Tighten it so the user sees the real backend reason:
  - Concatenate `data?.reason` when present (e.g. `"Forbidden: admin role required (no_row)"`).
  - If both are missing, fall back to `"Invite failed (no details)"` instead of the generic Supabase string.
- Now that `invited_by` will be the external admin id, change the call site to pass `invited_by_user_id: user?.id ?? null` again (the FK violation is gone because we're inserting into the external project).

### 3. No DB migrations, no RLS changes, no schema changes.

`admin_users` stays private. `client_invites` RLS is unchanged. Nothing in Lovable Cloud is touched beyond reading `EXTERNAL_SUPABASE_SERVICE_ROLE_KEY`.

## Test plan (one run only)

After deploy, click **Send Invite** on Smartlook (`b486d456-…`, `kocabeantester@smartlook.co.za`, "KocaBeanTester"). Then verify via `supabase--read_query` against the external project equivalents:
1. New row in external `auth.users` for that email with `user_metadata.client_id = b486d456-…`
2. New row in external `client_invites` with matching `client_id`, `email`, `status='pending'`, `invited_by` = admin's external user id, valid `token`
3. Toast in UI shows "Invite sent" with the link `…/accept-invite?token=…`
4. Do **not** trigger the accept flow.

## Report after implementation

Will return: files changed, confirmed root cause, env-var usage confirmation, auth user creation result, `client_invites` row result, generated invite link, and any remaining errors.
