# Koca Bean Hub Agent Rules

This repo powers the Koca Bean Hub / Command Centre.

## Hard Rules

- Do not weaken Supabase RLS.
- Do not expose service role keys.
- Do not hardcode secrets.
- Do not edit `.env` files except `.env.example` when explicitly requested.
- Do not change unrelated files.
- Do not remove working features.
- Do not refactor broadly unless specifically requested.
- Prefer small, reviewable commits.
- Preserve existing dashboard, enquiry, client, auth, and admin flows.
- Do not modify package dependencies unless required and explained.
- Do not push to GitHub unless explicitly instructed.

## High Risk Areas

Treat these as sensitive:

- `supabase/migrations/*`
- `supabase/functions/*`
- `src/integrations/supabase/*`
- `src/types/database.ts`
- `src/lib/auth*`
- `src/hooks/useAuth*`
- `src/context/Auth*`
- `.env*`

## Supabase Security Rules

- Never disable RLS.
- Never create broad public access policies on private tables.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code.
- Admin-only data must stay admin-only.
- Client data must stay scoped to the correct user/client.
- Public forms may only insert safe intake data.

## Required Checks

Before finishing any task, run:

npm run lint
npx tsc --noEmit
npm run build

If a command fails, report the error clearly and do not hide it.

## Output Required From Agent

At the end of every task, report:

1. Summary of changes.
2. Files changed.
3. Security impact.
4. Commands run and results.
5. Manual test steps.
6. Risks or follow-up items.
