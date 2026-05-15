// The send-client-invite edge function is deployed on Lovable Cloud
// (VITE_SUPABASE_URL), but the app's main supabase client points at the
// external Supabase project (where auth + business data live). Using
// supabase.functions.invoke() would route to the wrong project, so we call
// the Lovable Cloud functions endpoint directly.

const CLOUD_URL = import.meta.env.VITE_SUPABASE_URL as string;
const CLOUD_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export async function callInviteFunction(
  body: Record<string, unknown>,
  accessToken?: string,
): Promise<{ data: any; error: { message: string } | null }> {
  try {
    const res = await fetch(`${CLOUD_URL}/functions/v1/send-client-invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: CLOUD_ANON,
        Authorization: `Bearer ${accessToken ?? CLOUD_ANON}`,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    if (!res.ok) {
      return { data, error: { message: data?.error || `HTTP ${res.status}` } };
    }
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: { message: err?.message || "Network error" } };
  }
}
