import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// External Supabase project (where admin_users table and admin auth live).
// These are publishable values, safe to embed.
const EXTERNAL_SUPABASE_URL = "https://yxccaoiznqklgnxdsdlr.supabase.co";
const EXTERNAL_SUPABASE_ANON_KEY = "sb_publishable_0uD0yzrWL6uBDjzQCEBpcg_t80Sj2ng";

const MIN_PASSWORD_LENGTH = 8;

/**
 * Validates that the caller is an authenticated active super_admin in the EXTERNAL Supabase project.
 * Returns null on success, or a Response on failure (to be returned directly to the client).
 */
async function requireAdminCaller(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    return new Response(
      JSON.stringify({ error: "Unauthorized: missing bearer token" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  const token = authHeader.slice("bearer ".length).trim();

  // Verify the token against the EXTERNAL Supabase auth (where admins authenticate).
  const externalClient = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userRes, error: userErr } = await externalClient.auth.getUser(token);
  if (userErr || !userRes?.user) {
    console.warn("[admin-auth] invalid external session", { msg: userErr?.message });
    return new Response(
      JSON.stringify({ error: "Unauthorized: invalid session" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const userId = userRes.user.id;
  const userEmail = userRes.user.email ?? null;

  // Look up admin_users on the EXTERNAL project. Prefer a service-role key if
  // configured (RLS-independent); otherwise fall back to a JWT-scoped client.
  const externalServiceKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY");
  const lookupClient = externalServiceKey
    ? createClient(EXTERNAL_SUPABASE_URL, externalServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      });

  const { data: adminRow, error: adminErr } = await lookupClient
    .from("admin_users")
    .select("role, is_active")
    .eq("user_id", userId)
    .maybeSingle();

  if (adminErr) {
    console.error("[admin-auth] admin_users lookup error", {
      userId, userEmail, usingServiceKey: !!externalServiceKey, msg: adminErr.message, code: (adminErr as any).code,
    });
    return new Response(
      JSON.stringify({ error: "Forbidden: admin role required", reason: "lookup_error" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  if (!adminRow) {
    console.warn("[admin-auth] no admin_users row", { userId, userEmail, usingServiceKey: !!externalServiceKey });
    return new Response(
      JSON.stringify({ error: "Forbidden: admin role required", reason: "no_row" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  if (adminRow.is_active !== true || adminRow.role !== "super_admin") {
    console.warn("[admin-auth] role/active mismatch", { userId, userEmail, role: adminRow.role, is_active: adminRow.is_active });
    return new Response(
      JSON.stringify({ error: "Forbidden: admin role required", reason: "role_mismatch" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Validate token action (public, no auth needed) ──
    if (action === "validate") {
      const { token } = body;
      if (!token || typeof token !== "string") {
        return new Response(
          JSON.stringify({ error: "token is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: invite, error: inviteErr } = await supabaseAdmin
        .from("client_invites")
        .select("id, email, client_id, status, expires_at")
        .eq("token", token)
        .single();

      if (inviteErr || !invite) {
        return new Response(
          JSON.stringify({ valid: false }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (invite.status !== "pending" || new Date(invite.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ valid: false }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ valid: true, email: invite.email, client_id: invite.client_id, id: invite.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Accept invite action (public; secured by single-use token) ──
    if (action === "accept") {
      const { token, password } = body;
      if (!token || typeof token !== "string") {
        return new Response(
          JSON.stringify({ error: "token is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Server-side password validation — never trust the client.
      if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
        return new Response(
          JSON.stringify({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (password.length > 256) {
        return new Response(
          JSON.stringify({ error: "Password is too long" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: invite, error: inviteErr } = await supabaseAdmin
        .from("client_invites")
        .select("*")
        .eq("token", token)
        .single();

      if (inviteErr || !invite) {
        return new Response(
          JSON.stringify({ error: "Invite not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (invite.status !== "pending" || new Date(invite.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: "Invite expired or already used" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const authUser = users?.users?.find((u: any) => u.email === invite.email);

      if (authUser) {
        await supabaseAdmin.auth.admin.updateUserById(authUser.id, { password });
      } else {
        const { error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: invite.email,
          password,
          email_confirm: true,
          user_metadata: { client_id: invite.client_id },
        });
        if (createErr) {
          return new Response(
            JSON.stringify({ error: createErr.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      await supabaseAdmin
        .from("client_invites")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", invite.id);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Send invite action (PRIVILEGED — admin only) ──
    // CRITICAL: This path can create auth users and reset passwords (via the accept flow).
    // It MUST be protected against unauthenticated access.
    const adminCheck = await requireAdminCaller(req);
    if (adminCheck) return adminCheck;

    const { client_id, invited_by_user_id, client_email, client_name } = body;

    if (!client_id || typeof client_id !== "string") {
      return new Response(
        JSON.stringify({ error: "client_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!client_email || typeof client_email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client_email)) {
      return new Response(
        JSON.stringify({ error: "valid client_email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create auth user with temp password (only used until invitee sets their own).
    const tempPassword = crypto.randomUUID();
    const { error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: client_email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: client_name || "",
        client_id: client_id,
      },
    });

    if (authError && !authError.message.includes("already been registered")) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create invite record
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("client_invites")
      .insert({
        client_id,
        email: client_email,
        invited_by: invited_by_user_id || null,
      })
      .select("token")
      .single();

    if (inviteError) {
      return new Response(
        JSON.stringify({ error: inviteError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const siteUrl = Deno.env.get("SITE_URL") || req.headers.get("origin") || "";
    const inviteLink = `${siteUrl}/accept-invite?token=${invite.token}`;

    return new Response(
      JSON.stringify({ success: true, email: client_email, invite_link: inviteLink }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    // Log the real error server-side for debugging via Functions → Logs.
    // Never echo internal error details back to the client.
    console.error("send-client-invite unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
