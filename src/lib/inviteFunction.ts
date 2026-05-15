// All invite operations run against the external Supabase project
// (yxccaoiznqklgnxdsdlr) — the single source of truth for auth, admin_users,
// clients, client_invites, and business data.
// The edge function send-client-invite is deployed on that same project,
// so we call its functions endpoint directly using the external project credentials.

const EXTERNAL_URL = "https://yxccaoiznqklgnxdsdlr.supabase.co";
const EXTERNAL_ANON = "sb_publishable_0uD0yzrWL6uBDjzQCEBpcg_t80Sj2ng";

export async function callInviteFunction(
    body: Record<string, unknown>,
    accessToken?: string,
  ): Promise<{ data: any; error: { message: string } | null }> {
    try {
          const res = await fetch(`${EXTERNAL_URL}/functions/v1/send-client-invite`, {
                  method: "POST",
                  headers: {
                            "Content-Type": "application/json",
                            apikey: EXTERNAL_ANON,
                            Authorization: `Bearer ${accessToken ?? EXTERNAL_ANON}`,
                  },
                  body: JSON.stringify(body),
          });
          const text = await res.text();
          let data: any = null;
          try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
          if (!res.ok) {
                  const detail = data?.reason ? ` (${data.reason})` : "";
                  return { data, error: { message: (data?.error || `HTTP ${res.status}`) + detail } };
          }
          return { data, error: null };
    } catch (err: any) {
          return { data: null, error: { message: err?.message || "Network error" } };
    }
}
