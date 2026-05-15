## Goal

Make the client portal actually work. Right now `AppUser.clientId` is never populated, so `ClientDashboard`, `ClientProjects`, `ClientReports`, and `ClientSupport` always render with `clientId === undefined` and show no data.

## Fix 1 — AuthContext: resolve `clientId` for client users

In `src/contexts/AuthContext.tsx`, extend `resolveAppUser` so that when the user is not an admin:

1. Try `supaUser.user_metadata.client_id` first. The `send-client-invite` accept flow sets this on `auth.users` metadata, so most client users will have it.
2. If missing, look it up by email:
   ```ts
   supabase.from("clients").select("id").eq("email", supaUser.email).maybeSingle()
   ```
3. Return `{ role: "client", clientId }`. If no `clientId` can be resolved, still return the user but with `clientId` undefined and surface a friendly `authError` like "Your account isn't linked to a client yet — please contact support." Keep the user signed in so they see the message instead of a blank screen.
4. Wrap the new lookup in the existing `withTimeout` helper so a hung query doesn't freeze auth.

No schema changes needed — `clients.email` already exists.

## Fix 2 — Client dashboard frontend pass

While `clientId` is wired, polish the client-facing pages so the portal feels finished:

- **`ClientDashboard`** — show greeting with `user.name`, KPI cards (active projects, open tasks, latest report date), and quick links into Projects / Reports / Support. Empty states for each section.
- **`ClientProjects`** — list view with status badge, last update, and a detail drawer or expandable row. Empty state.
- **`ClientReports`** — chronological list grouped by month; each item links/downloads the report. Empty state.
- **`ClientSupport`** — keep the four "Need help?" actions (email settings, add staff, upgrade website, chat). Confirm forms write to `email_settings_requests`, `staff_authorizations`, `upgrade_requests` per the existing memory.
- Shared: a `ClientLayout` (or reuse DashboardLayout in client mode) with sidebar nav: Dashboard, Projects, Reports, Support, plus sign-out.
- Loading skeletons and a single "no client linked yet" state shown across all pages when `clientId` is missing.

## Out of scope

- No edits to `send-client-invite` or its secrets (per your instruction).
- No DB migrations.
- No changes to admin pages.

## Files expected to change

- `src/contexts/AuthContext.tsx` — resolve `clientId`.
- `src/pages/client/ClientDashboard.tsx`, `ClientProjects.tsx`, `ClientReports.tsx`, `ClientSupport.tsx` — frontend polish + empty/loading states.
- Possibly a new `src/components/layout/ClientLayout.tsx` if DashboardLayout doesn't already adapt.
- Possibly small additions to `src/hooks/useClientData.ts` (or wherever `useClientProjects` etc. live) for typing/empty handling — read-only behavior only.

## Open question

Do you want the existing `DashboardLayout` reused for the client portal (with a different nav set when `user.role === "client"`), or a separate `ClientLayout` component? I'll default to reusing `DashboardLayout` with role-based nav unless you prefer otherwise.