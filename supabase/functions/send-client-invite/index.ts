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
    const { client_id, invited_by_user_id } = await req.json();

    if (!client_id) {
      return new Response(
        JSON.stringify({ error: "client_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get client details
    const { data: client, error: clientError } = await supabaseAdmin
      .from("clients")
      .select("id, business_name, email")
      .eq("id", client_id)
      .single();

    if (clientError || !client) {
      return new Response(
        JSON.stringify({ error: "Client not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!client.email) {
      return new Response(
        JSON.stringify({ error: "Client has no email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create auth user with a temporary password (they'll set their own via the invite)
    const tempPassword = crypto.randomUUID();
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: client.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: client.business_name,
        client_id: client.id,
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
        client_id: client.id,
        email: client.email,
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

    // For now, return the invite link (email sending can be added later)
    const siteUrl = Deno.env.get("SITE_URL") || req.headers.get("origin") || "https://id-preview--13014076-d301-4351-acf7-2cdb2daadb34.lovable.app";
    const inviteLink = `${siteUrl}/accept-invite?token=${invite.token}`;

    return new Response(
      JSON.stringify({
        success: true,
        email: client.email,
        invite_link: inviteLink,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
