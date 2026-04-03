import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    // ── Accept invite action ──
    if (action === "accept") {
      const { token, password } = body;
      if (!token || !password) {
        return new Response(
          JSON.stringify({ error: "token and password are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Look up the invite
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

      // Find the auth user by email and update their password
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const authUser = users?.users?.find((u: any) => u.email === invite.email);

      if (authUser) {
        await supabaseAdmin.auth.admin.updateUserById(authUser.id, { password });
      } else {
        // Create user if doesn't exist
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

      // Mark invite as accepted
      await supabaseAdmin
        .from("client_invites")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", invite.id);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Send invite action (default) ──
    const { client_id, invited_by_user_id } = body;

    if (!client_id) {
      return new Response(
        JSON.stringify({ error: "client_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // We need to fetch client from the EXTERNAL supabase
    // For now, client info is passed from the frontend
    const { client_email, client_name } = body;

    if (!client_email) {
      return new Response(
        JSON.stringify({ error: "client_email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create auth user with temp password
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
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
