import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
};

// When deployed to the external Supabase project (yxccaoiznqklgnxdsdlr),
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.
// When still running on Lovable Cloud (hprcxtjyyrtuzlsqdito), fall back to
// the EXTERNAL_SUPABASE_* secrets that must be set there manually.
const SUPABASE_URL =
    Deno.env.get("SUPABASE_URL") ||
    Deno.env.get("EXTERNAL_SUPABASE_URL") ||
    "https://yxccaoiznqklgnxdsdlr.supabase.co";

// Anon/publishable key — used only to verify caller JWT against the external project.
const SUPABASE_ANON_KEY =
    Deno.env.get("SUPABASE_ANON_KEY") ||
    "sb_publishable_0uD0yzrWL6uBDjzQCEBpcg_t80Sj2ng";

const MIN_PASSWORD_LENGTH = 8;

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
          status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

function getExternalAdmin() {
    // Prefer native project service role key (set automatically when deployed to
  // the external project). Fall back to manually-set secret for Lovable Cloud.
  const serviceKey =
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
        Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) {
          console.error("[config] No service role key found. Set SUPABASE_SERVICE_ROLE_KEY (external project) or EXTERNAL_SUPABASE_SERVICE_ROLE_KEY (Lovable Cloud secret).");
          return null;
    }
    return createClient(SUPABASE_URL, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
    });
}

/**
 * Validates that the caller is an authenticated active super_admin in the external Supabase project.
 * Returns the verified admin user id on success, or a Response on failure.
 */
async function requireAdminCaller(
    req: Request,
    externalAdmin: ReturnType<typeof createClient>,
  ): Promise<{ adminUserId: string } | Response> {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.toLowerCase().startsWith("bearer ")) {
          return jsonResponse({ error: "Unauthorized: missing bearer token" }, 401);
    }
    const token = authHeader.slice(7).trim();

  // Verify token against the external auth project.
  const externalAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
  });
    const { data: userRes, error: userErr } = await externalAuth.auth.getUser(token);
    if (userErr || !userRes?.user) {
          console.warn("[admin-auth] invalid external session", { msg: userErr?.message });
          return jsonResponse({ error: "Unauthorized: invalid session" }, 401);
    }

  const userId = userRes.user.id;
    const userEmail = userRes.user.email;

  const { data: adminRow, error: adminErr } = await externalAdmin
      .from("admin_users")
      .select("role, is_active")
      .eq("user_id", userId)
      .maybeSingle();

  if (adminErr) {
        console.error("[admin-auth] admin_users lookup error", {
                userId, userEmail, msg: adminErr.message, code: (adminErr as any).code,
        });
        return jsonResponse({ error: "Forbidden: admin role required", reason: "lookup_error" }, 403);
  }
    if (!adminRow) {
          console.warn("[admin-auth] no admin_users row", { userId, userEmail });
          return jsonResponse({ error: "Forbidden: admin role required", reason: "no_row" }, 403);
    }
    if ((adminRow as any).is_active !== true || (adminRow as any).role !== "super_admin") {
          console.warn("[admin-auth] role/active mismatch", { userId, userEmail, ...(adminRow as any) });
          return jsonResponse({ error: "Forbidden: admin role required", reason: "role_mismatch" }, 403);
    }

  return { adminUserId: userId };
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
          return new Response("ok", { headers: corsHeaders });
    }

             try {
                   const externalAdmin = getExternalAdmin();
                   if (!externalAdmin) {
                           return jsonResponse({ error: "Server misconfigured: service role key missing. Set SUPABASE_SERVICE_ROLE_KEY on the external project or EXTERNAL_SUPABASE_SERVICE_ROLE_KEY on Lovable Cloud." }, 500);
                   }

      const body = await req.json();
                   const { action, token, password, client_id, client_email, client_name } = body;

      // ── Validate token (public) ──
      if (action === "validate") {
              if (!token || typeof token !== "string") {
                        return jsonResponse({ error: "token is required" }, 400);
              }

                     const { data: invite, error: inviteErr } = await externalAdmin
                .from("client_invites")
                .select("id, email, client_id, status, expires_at")
                .eq("token", token)
                .single();

                     if (inviteErr || !invite) return jsonResponse({ valid: false });
              if ((invite as any).status !== "pending" || new Date((invite as any).expires_at) < new Date()) {
                        return jsonResponse({ valid: false });
              }
              return jsonResponse({
                        valid: true,
                        email: (invite as any).email,
                        client_id: (invite as any).client_id,
                        id: (invite as any).id,
              });
      }

      // ── Accept invite (public; secured by single-use token) ──
      if (action === "accept") {
              if (!token || typeof token !== "string") {
                        return jsonResponse({ error: "token is required" }, 400);
              }
              if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
                        return jsonResponse({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, 400);
              }
              if (password.length > 256) {
                        return jsonResponse({ error: "Password is too long" }, 400);
              }

                     const { data: invite, error: inviteErr } = await externalAdmin
                .from("client_invites")
                .select("*")
                .eq("token", token)
                .single();

                     if (inviteErr || !invite) return jsonResponse({ error: "Invite not found" }, 404);
              if ((invite as any).status !== "pending" || new Date((invite as any).expires_at) < new Date()) {
                        return jsonResponse({ error: "Invite expired or already used" }, 400);
              }

                     // Check if auth user already exists
                     const { data: existingList } = await (externalAdmin as any).auth.admin.listUsers();
              const authUser = existingList?.users?.find((u: any) => u.email === (invite as any).email);

                     if (authUser) {
                               await (externalAdmin as any).auth.admin.updateUserById(authUser.id, {
                                           password,
                                           user_metadata: { ...(authUser.user_metadata || {}), client_id: (invite as any).client_id },
                               });
                     } else {
                               const { error: createErr } = await (externalAdmin as any).auth.admin.createUser({
                                           email: (invite as any).email,
                                           password,
                                           email_confirm: true,
                                           user_metadata: { client_id: (invite as any).client_id },
                               });
                               if (createErr) return jsonResponse({ error: createErr.message }, 400);
                     }

                     await externalAdmin
                .from("client_invites")
                .update({ status: "accepted", accepted_at: new Date().toISOString() })
                .eq("id", (invite as any).id);

                     return jsonResponse({ success: true });
      }

      // ── Send invite (PRIVILEGED — admin only) ──
      if (action === "send" || !action) {
              const adminCheck = await requireAdminCaller(req, externalAdmin);
              if (adminCheck instanceof Response) return adminCheck;
              const { adminUserId } = adminCheck;

                     if (!client_id || typeof client_id !== "string") {
                               return jsonResponse({ error: "client_id is required" }, 400);
                     }
              if (!client_email || typeof client_email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client_email)) {
                        return jsonResponse({ error: "valid client_email is required" }, 400);
              }

                     // Create auth user (in external project) with throwaway password — replaced on accept.
                     const tempPassword = crypto.randomUUID() + crypto.randomUUID();
              const { error: authError } = await (externalAdmin as any).auth.admin.createUser({
                        email: client_email,
                        password: tempPassword,
                        email_confirm: true,
                        user_metadata: {
                                    full_name: client_name || "",
                                    client_id,
                        },
              });

                     if (authError && !String(authError.message || "").includes("already been registered")) {
                               console.error("[send] createUser error", { msg: authError.message });
                               return jsonResponse({ error: authError.message }, 400);
                     }

                     // Insert invite row (external project). invited_by points at external auth.users.
                     const { data: invite, error: inviteError } = await externalAdmin
                .from("client_invites")
                .insert({
                            client_id,
                            email: client_email,
                            invited_by: adminUserId,
                })
                .select("token")
                .single();

                     if (inviteError) {
                               console.error("[send] client_invites insert error", { msg: inviteError.message, code: (inviteError as any).code });
                               return jsonResponse({ error: inviteError.message }, 500);
                     }

                     const siteUrl = Deno.env.get("SITE_URL") || "https://preview--koca-bean-hub.lovable.app";
              const inviteLink = `${siteUrl}/accept-invite?token=${(invite as any).token}`;

                     return jsonResponse({ success: true, email: client_email, invite_link: inviteLink });
      }

      return jsonResponse({ error: "Unknown action" }, 400);
             } catch (err) {
                   console.error("send-client-invite unhandled error:", err);
                   return jsonResponse({ error: "Internal server error" }, 500);
             }
});
