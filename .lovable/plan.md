## Diagnosis

The 403 is coming from `requireAdminCaller()` inside `supabase/functions/send-client-invite/index.ts`, specifically this check:

```ts
scopedClient
  .from("admin_users")
  .select("role, is_active")
  .eq("user_id", userRes.user.id)
  .maybeSingle()
```

The function treats any lookup error, missing row, inactive row, or non-`super_admin` role as:

```ts
403 Forbidden: admin role required
```

The current architecture is split:

- The browser app signs admins in through the external project client in `src/integrations/supabase/client.ts`.
- `send-client-invite` is deployed on Lovable Cloud, per `supabase/config.toml`.
- The edge function verifies the bearer JWT against the external project, then reads external `admin_users` using that same user JWT.
- No recent Lovable Cloud function logs were found for `Forbidden`, which means either the latest call was not captured/reached, or the 403 is happening on a deployed version/log path we need to test directly.

## Likely root cause

Even when `auth.getUser(token)` succeeds, the scoped `admin_users` query can return no row or an RLS error if the external project's `admin_users` SELECT policy does not allow the caller to read their own admin row. Since the function uses the user's anon-scoped JWT for the role lookup, it depends on external RLS being correct.

That makes valid `super_admin`s appear forbidden.

## Implementation plan

1. **Add targeted diagnostics to the edge function**
   - Log a safe, non-sensitive marker for which branch failed:
     - missing bearer token
     - invalid external session
     - admin row lookup error
     - admin row missing
     - role/inactive mismatch
   - Do not log tokens, secrets, or full user objects.

2. **Make admin authorization server-side and RLS-independent**
   - Keep verifying the incoming bearer token with the external auth project.
   - For the `admin_users` lookup, use a server-side credential for the external project instead of the user's RLS-scoped anon client.
   - This avoids false 403s caused by external RLS while still authorizing by the verified `user_id`.

3. **Move external project credentials out of hardcoded source where appropriate**
   - Keep the external URL / publishable key only if needed for `auth.getUser`.
   - Add/use an external service credential secret for the server-side admin role lookup.
   - If the secret is not already configured, request it before deploying.

4. **Preserve the security boundary**
   - The invite send path remains admin-only.
   - Public `validate` and `accept` actions remain token-secured and unauthenticated.
   - The edge function still writes invite records only with Lovable Cloud server credentials.

5. **Validate after approval**
   - Deploy/test the function with a valid admin JWT.
   - Confirm the function reaches Lovable Cloud and returns success for `support@kocabean.co.za` or another active `super_admin`.
   - Confirm non-admin or missing-token calls still return 401/403.