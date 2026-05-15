import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
              "authorization, x-client-info, apikey, content-type",
};

// When deployed to external Supabase project (yxccaoiznqklgnxdsdlr),
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.
// When still on Lovable Cloud (hprcxtjyyrtuzlsqdito), use EXTERNAL_SUPABASE_* fallbacks.
const SUPABASE_URL =
      Deno.env.get("SUPABASE_URL") ||
      Deno.env.get("EXTERNAL_SUPABASE_URL") ||
      "https://yxccaoiznqklgnxdsdlr.supabase.co";

// Anon/publishable key for JWT verification. Deno native SUPABASE_ANON_KEY is the
// JWT-format anon key; the fallback is the publishable key visible in client.ts.
const ANON_KEY =
      Deno.env.get("SUPABASE_ANON_KEY") ||
      "sb_publishable_0uD0yzrWL6uBDjzQCEBpcg_t80Sj2ng";

const MIN_PASSWORD_LENGTH = 8;

function jsonResponse(body: unknown, status = 200) {
      return new Response(JSON.stringify(body), {
              status,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
}

function getServiceClient() {
      const serviceKey =
              Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
              Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY");
      if (!serviceKey) {
              console.error("[config] No service role key. Set SUPABASE_SERVICE_ROLE_KEY on the external project.");
              return null;
      }
      return createClient(SUPABASE_URL, serviceKey, {
              auth: { persistSession: false, autoRefreshToken: false },
      });
}

async function requireAdminCaller(
      req: Request,
      admin: ReturnType<typeof createClient>,
    ): Promise<{ adminUserId: string } | Response> {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.toLowerCase().startsWith("bearer ")) {
              console.warn("[admin-auth] missing bearer token");
              return jsonResponse({ error: "Unauthorized: missing bearer token" }, 401);
      }
      const token = authHeader.slice(7).trim();

  // Verify the caller's JWT against the external auth project.
  const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
  });
      const { data: userRes, error: userErr } = await anonClient.auth.getUser(token);
      if (userErr || !userRes?.user) {
              console.warn("[admin-auth] invalid session:", userErr?.message);
              return jsonResponse({ error: "Unauthorized: invalid session", detail: userErr?.message }, 401);
      }

  const userId = userRes.user.id;
      const userEmail = userRes.user.email;

  // Check admin_users using service role (bypasses RLS).
  const { data: adminRow, error: adminErr } = await admin
        .from("admin_users")
        .select("role, is_active")
        .eq("user_id", userId)
        .maybeSingle();

  if (adminErr) {
          console.error("[admin-auth] admin_users lookup error:", adminErr.message, "code:", (adminErr as any).code);
          return jsonResponse({ error: "Forbidden: admin check failed", reason: "lookup_error", detail: adminErr.message }, 403);
  }
      if (!adminRow) {
              console.warn("[admin-auth] no admin_users row for userId:", userId, "email:", userEmail);
              return jsonResponse({ error: "Forbidden: admin role required", reason: "no_row" }, 403);
      }
      if ((adminRow as any).is_active !== true) {
              console.warn("[admin-auth] account not active:", { userId, ...adminRow });
              return jsonResponse({ error: "Forbidden: account is not active", reason: "not_active" }, 403);
      }
      if ((adminRow as any).role !== "super_admin") {
              console.warn("[admin-auth] role mismatch:", { userId, role: (adminRow as any).role });
              return jsonResponse({ error: "Forbidden: super_admin role required", reason: "role_mismatch" }, 403);
      }

  return { adminUserId: userId };
}

Deno.serve(async (req) => {
      if (req.method === "OPTIONS") {
              return new Response("ok", { headers: corsHeaders });
      }

             try {
                     const serviceClient = getServiceClient();
                     if (!serviceClient) {
                               return jsonResponse({ error: "Server misconfigured: SUPABASE_SERVICE_ROLE_KEY not set" }, 500);
                     }

        let body: Record<string, unknown>;
                     try {
                               body = await req.json();
                     } catch {
                               return jsonResponse({ error: "Invalid JSON body" }, 400);
                     }
                     const { action, token, password, client_id, client_email, client_name } = body as Record<string, any>;

        // ── Validate invite token (public — no auth needed) ──
        if (action === "validate") {
                  if (!token || typeof token !== "string") {
                              return jsonResponse({ error: "token is required" }, 400);
                  }
                  const { data: invite, error: inviteErr } = await serviceClient
                    .from("client_invites")
                    .select("id, email, client_id, status, expires_at")
                    .eq("token", token)
                    .single();

                       if (inviteErr || !invite) return jsonResponse({ valid: false });
                  if (invite.status !== "pending" || new Date(invite.expires_at) < new Date()) {
                              return jsonResponse({ valid: false });
                  }
                  return jsonResponse({ valid: true, email: invite.email, client_id: invite.client_id, id: invite.id });
        }

        // ── Accept invite (public — secured by single-use token) ──
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

                       const { data: invite, error: inviteErr } = await serviceClient
                    .from("client_invites")
                    .select("*")
                    .eq("token", token)
                    .single();

                       if (inviteErr || !invite) return jsonResponse({ error: "Invite not found" }, 404);
                  if (invite.status !== "pending" || new Date(invite.expires_at) < new Date()) {
                              return jsonResponse({ error: "Invite expired or already used" }, 400);
                  }

                       // Find or create auth user on the external project.
                       const { data: listData } = await (serviceClient as any).auth.admin.listUsers();
                  const existingUser = listData?.users?.find((u: any) => u.email === invite.email);

                       if (existingUser) {
                                   const { error: updateErr } = await (serviceClient as any).auth.admin.updateUserById(existingUser.id, {
                                                 password,
                                                 user_metadata: { ...(existingUser.user_metadata || {}), client_id: invite.client_id },
                                   });
                                   if (updateErr) {
                                                 console.error("[accept] updateUserById error:", updateErr.message);
                                                 return jsonResponse({ error: updateErr.message }, 400);
                                   }
                       } else {
                                   const { error: createErr } = await (serviceClient as any).auth.admin.createUser({
                                                 email: invite.email,
                                                 password,
                                                 email_confirm: true,
                                                 user_metadata: { client_id: invite.client_id },
                                   });
                                   if (createErr) {
                                                 console.error("[accept] createUser error:", createErr.message);
                                                 return jsonResponse({ error: createErr.message }, 400);
                                   }
                       }

                       await serviceClient
                    .from("client_invites")
                    .update({ status: "accepted", accepted_at: new Date().toISOString() })
                    .eq("id", invite.id);

                       return jsonResponse({ success: true });
        }

        // ── Send invite (PRIVILEGED — requires valid super_admin JWT) ──
        // Default action is "send" — falls through if no action provided.
        if (action === "send" || action === undefined || action === null) {
                  const adminCheck = await requireAdminCaller(req, serviceClient);
                  if (adminCheck instanceof Response) return adminCheck;

                       if (!client_id || typeof client_id !== "string") {
                                   return jsonResponse({ error: "client_id is required" }, 400);
                       }
                  if (!client_email || typeof client_email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client_email)) {
                              return jsonResponse({ error: "valid client_email is required" }, 400);
                  }

                       // Create auth user on external project (throwaway password replaced on accept).
                       const tempPassword = crypto.randomUUID() + "-" + crypto.randomUUID();
                  const { error: authError } = await (serviceClient as any).auth.admin.createUser({
                              email: client_email,
                              password: tempPassword,
                              email_confirm: true,
                              user_metadata: {
                                            full_name: client_name || "",
                                            client_id,
                              },
                  });

                       if (authError && !String(authError.message || "").toLowerCase().includes("already been registered")) {
                                   console.error("[send] createUser error:", authError.message);
                                   return jsonResponse({ error: "Failed to create auth user: " + authError.message }, 400);
                       }

                       // Insert invite row.
                       // invited_by is set to null to avoid FK issues across project boundaries.
                       const { data: invite, error: inviteError } = await serviceClient
                    .from("client_invites")
                    .insert({
                                  client_id,
                                  email: client_email,
                                  invited_by: null,
                    })
                    .select("token")
                    .single();

                       if (inviteError) {
                                   console.error("[send] client_invites insert error:", inviteError.message, "code:", (inviteError as any).code);
                                   return jsonResponse({ error: "Failed to create invite: " + inviteError.message }, 500);
                       }

                       const siteUrl = Deno.env.get("SITE_URL") || "https://preview--koca-bean-hub.lovable.app";
                  const inviteLink = `${siteUrl}/accept-invite?token=${invite.token}`;

                       console.log("[send] invite created for", client_email, "link:", inviteLink);
                  return jsonResponse({ success: true, email: client_email, invite_link: inviteLink });
        }

        return jsonResponse({ error: "Unknown action: " + action }, 400);
             } catch (err: any) {
    console.error("[unhandled]", err?.message || err);
                     return jsonResponse({ error: "Internal server error: " + (err?.message || "unknown") }, 500);
             }
});
