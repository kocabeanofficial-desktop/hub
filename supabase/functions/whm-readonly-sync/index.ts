import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") ||
  Deno.env.get("EXTERNAL_SUPABASE_URL") ||
  "https://yxccaoiznqklgnxdsdlr.supabase.co";

const ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ||
  "sb_publishable_0uD0yzrWL6uBDjzQCEBpcg_t80Sj2ng";

type SupabaseClient = ReturnType<typeof createClient>;
type JsonRecord = Record<string, unknown>;
type AdminRow = { role?: string; is_active?: boolean };
type DbClientIdRow = { client_id?: string | null };
type HostingAccountRow = DbClientIdRow & { cpanel_username?: string | null };
type DomainRow = DbClientIdRow & { domain_name?: string | null };
type ClientRow = { id?: string | null; website_url?: string | null };

type WhmAccount = {
  whm_user: string;
  primary_domain: string | null;
  owner: string | null;
  plan: string | null;
  ip_address: string | null;
  status: string | null;
  raw_status: string | null;
  disk_used_mb: number | null;
  disk_quota_mb: number | null;
  bandwidth_used_mb: number | null;
  bandwidth_quota_mb: number | null;
  domains: Array<{ domain_name: string; domain_type: string | null; document_root: string | null }>;
};

type MatchResult = {
  match_status: "matched" | "possible_match" | "unmatched" | "conflict";
  matched_client_id: string | null;
  match_confidence: number | null;
};

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

  if (!serviceKey) return null;

  return createClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireAdminCaller(
  req: Request,
  admin: SupabaseClient,
): Promise<{ adminUserId: string } | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    return jsonResponse({ error: "Unauthorized: missing bearer token" }, 401);
  }

  const token = authHeader.slice(7).trim();
  const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userRes, error: userErr } = await anonClient.auth.getUser(token);
  if (userErr || !userRes?.user) {
    return jsonResponse({ error: "Unauthorized: invalid session" }, 401);
  }

  const userId = userRes.user.id;
  const { data: adminRow, error: adminErr } = await admin
    .from("admin_users")
    .select("role, is_active")
    .eq("user_id", userId)
    .maybeSingle();

  if (adminErr) {
    console.error("[admin-auth] admin_users lookup failed");
    return jsonResponse({ error: "Forbidden: admin check failed" }, 403);
  }

  const activeAdmin = adminRow as AdminRow | null;
  if (!activeAdmin || activeAdmin.is_active !== true) {
    return jsonResponse({ error: "Forbidden: active admin role required" }, 403);
  }

  if (!["admin", "super_admin"].includes(String(activeAdmin.role))) {
    return jsonResponse({ error: "Forbidden: admin role required" }, 403);
  }

  return { adminUserId: userId };
}

function cleanString(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function parseMb(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const raw = value.trim().toLowerCase();
  if (!raw || raw === "unlimited" || raw === "none") return null;

  const match = raw.match(/^([\d.]+)\s*([kmgt]?b?|[kmgt])?$/i);
  if (!match) return null;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return null;

  const unit = (match[2] || "m").replace("b", "");
  if (unit === "k") return amount / 1024;
  if (unit === "g") return amount * 1024;
  if (unit === "t") return amount * 1024 * 1024;
  return amount;
}

function normalizeDomain(value: unknown): string | null {
  const text = cleanString(value);
  if (!text) return null;

  const withProtocol = /^[a-z]+:\/\//i.test(text) ? text : `https://${text}`;
  try {
    return new URL(withProtocol).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return text
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .split(":")[0] || null;
  }
}

function normalizeWhmAccount(raw: Record<string, unknown>): WhmAccount | null {
  const whmUser = cleanString(raw.user ?? raw.username);
  if (!whmUser) return null;

  const primaryDomain = normalizeDomain(raw.domain ?? raw.primary_domain);
  const suspended = cleanString(raw.suspended);
  const status = suspended === "1" || suspended === "true" ? "suspended" : "active";
  const rawStatus = cleanString(raw.suspendreason) || cleanString(raw.status) || suspended;

  const domains: WhmAccount["domains"] = [];
  if (primaryDomain) {
    domains.push({
      domain_name: primaryDomain,
      domain_type: "primary",
      document_root: cleanString(raw.documentroot ?? raw.document_root),
    });
  }

  const extraDomains = Array.isArray(raw.domains) ? raw.domains : [];
  for (const item of extraDomains) {
    const itemRecord = typeof item === "object" && item !== null ? (item as JsonRecord) : {};
    const domainName = typeof item === "string" ? normalizeDomain(item) : normalizeDomain(itemRecord.domain);
    if (!domainName || domains.some((domain) => domain.domain_name === domainName)) continue;
    domains.push({
      domain_name: domainName,
      domain_type: cleanString(itemRecord.type) || "observed",
      document_root: cleanString(itemRecord.documentroot ?? itemRecord.document_root),
    });
  }

  return {
    whm_user: whmUser,
    primary_domain: primaryDomain,
    owner: cleanString(raw.owner),
    plan: cleanString(raw.plan ?? raw.package),
    ip_address: cleanString(raw.ip),
    status,
    raw_status: rawStatus,
    disk_used_mb: parseMb(raw.diskused ?? raw.disk_used ?? raw.disk_used_mb),
    disk_quota_mb: parseMb(raw.disklimit ?? raw.disk_quota ?? raw.disk_quota_mb),
    bandwidth_used_mb: parseMb(raw.bwused ?? raw.bandwidthused ?? raw.bandwidth_used_mb),
    bandwidth_quota_mb: parseMb(raw.bwlimit ?? raw.bandwidthlimit ?? raw.bandwidth_quota_mb),
    domains,
  };
}

function getNestedRecord(value: unknown, key: string): JsonRecord | null {
  if (typeof value !== "object" || value === null) return null;
  const child = (value as JsonRecord)[key];
  return typeof child === "object" && child !== null ? (child as JsonRecord) : null;
}

function getArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

function extractWhmAccounts(payload: unknown): WhmAccount[] {
  const payloadRecord = typeof payload === "object" && payload !== null ? (payload as JsonRecord) : {};
  const dataRecord = getNestedRecord(payloadRecord, "data");
  const rawAccounts =
    getArray(dataRecord?.acct) ||
    getArray(payloadRecord.acct) ||
    getArray(payloadRecord.accounts) ||
    [];

  return rawAccounts
    .map((item) => normalizeWhmAccount(item as JsonRecord))
    .filter((item): item is WhmAccount => item !== null);
}

async function fetchWhmAccounts(): Promise<WhmAccount[]> {
  const baseUrl = Deno.env.get("WHM_BASE_URL");
  const username = Deno.env.get("WHM_RESELLER_USERNAME");
  const token = Deno.env.get("WHM_API_TOKEN");

  if (!baseUrl || !username || !token) {
    throw new Error("WHM credentials are not configured");
  }

  const url = new URL("/json-api/listaccts", baseUrl);
  url.searchParams.set("api.version", "1");

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `whm ${username}:${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`WHM list accounts request failed with status ${res.status}`);
  }

  const payload = await res.json();
  return extractWhmAccounts(payload);
}

function mockWhmAccounts(): WhmAccount[] {
  return [
    {
      whm_user: "demoacct",
      primary_domain: "example.co.za",
      owner: "root",
      plan: "mock-plan",
      ip_address: "192.0.2.10",
      status: "active",
      raw_status: "mock",
      disk_used_mb: 128,
      disk_quota_mb: 1024,
      bandwidth_used_mb: 256,
      bandwidth_quota_mb: 10240,
      domains: [{ domain_name: "example.co.za", domain_type: "primary", document_root: null }],
    },
  ];
}

function pushCandidate(
  candidates: Map<string, { clientId: string; confidence: number; sourceCount: number }>,
  clientId: string | null | undefined,
  confidence: number,
) {
  if (!clientId) return;
  const existing = candidates.get(clientId);
  if (existing) {
    existing.confidence = Math.max(existing.confidence, confidence);
    existing.sourceCount += 1;
    return;
  }
  candidates.set(clientId, { clientId, confidence, sourceCount: 1 });
}

function matchAccount(
  account: WhmAccount,
  hostingByUser: Map<string, string[]>,
  domainByName: Map<string, string[]>,
  clientByWebsiteDomain: Map<string, string[]>,
): MatchResult {
  const candidates = new Map<string, { clientId: string; confidence: number; sourceCount: number }>();
  const usernameKey = account.whm_user.toLowerCase();
  const domainKey = account.primary_domain ? normalizeDomain(account.primary_domain) : null;

  for (const clientId of hostingByUser.get(usernameKey) ?? []) {
    pushCandidate(candidates, clientId, 1);
  }

  if (domainKey) {
    for (const clientId of domainByName.get(domainKey) ?? []) {
      pushCandidate(candidates, clientId, 0.95);
    }
    for (const clientId of clientByWebsiteDomain.get(domainKey) ?? []) {
      pushCandidate(candidates, clientId, 0.9);
    }
  }

  const matches = Array.from(candidates.values());
  if (matches.length === 0) {
    return { match_status: "unmatched", matched_client_id: null, match_confidence: null };
  }

  if (matches.length > 1) {
    return { match_status: "conflict", matched_client_id: null, match_confidence: null };
  }

  const match = matches[0];
  return {
    match_status: match.sourceCount > 1 || match.confidence >= 0.95 ? "matched" : "possible_match",
    matched_client_id: match.clientId,
    match_confidence: match.confidence,
  };
}

async function loadMatchIndexes(admin: SupabaseClient) {
  const [hostingRes, domainRes, clientRes] = await Promise.all([
    admin.from("hosting_accounts").select("client_id, cpanel_username").not("cpanel_username", "is", null),
    admin.from("domains").select("client_id, domain_name"),
    admin.from("clients").select("id, website_url"),
  ]);

  if (hostingRes.error) throw hostingRes.error;
  if (domainRes.error) throw domainRes.error;
  if (clientRes.error) throw clientRes.error;

  const hostingByUser = new Map<string, string[]>();
  for (const row of hostingRes.data ?? []) {
    const typedRow = row as HostingAccountRow;
    const username = cleanString(typedRow.cpanel_username)?.toLowerCase();
    const clientId = cleanString(typedRow.client_id);
    if (!username || !clientId) continue;
    hostingByUser.set(username, [...(hostingByUser.get(username) ?? []), clientId]);
  }

  const domainByName = new Map<string, string[]>();
  for (const row of domainRes.data ?? []) {
    const typedRow = row as DomainRow;
    const domain = normalizeDomain(typedRow.domain_name);
    const clientId = cleanString(typedRow.client_id);
    if (!domain || !clientId) continue;
    domainByName.set(domain, [...(domainByName.get(domain) ?? []), clientId]);
  }

  const clientByWebsiteDomain = new Map<string, string[]>();
  for (const row of clientRes.data ?? []) {
    const typedRow = row as ClientRow;
    const domain = normalizeDomain(typedRow.website_url);
    const clientId = cleanString(typedRow.id);
    if (!domain || !clientId) continue;
    clientByWebsiteDomain.set(domain, [...(clientByWebsiteDomain.get(domain) ?? []), clientId]);
  }

  return { hostingByUser, domainByName, clientByWebsiteDomain };
}

async function getOrCreateServer(admin: SupabaseClient) {
  const label = Deno.env.get("WHM_SERVER_LABEL") || "Primary WHM";
  const baseUrlAlias = Deno.env.get("WHM_BASE_URL_ALIAS") || "primary-whm";

  const server = await admin
    .from("whm_servers")
    .upsert({ label, base_url_alias: baseUrlAlias, is_active: true }, { onConflict: "label" })
    .select("id")
    .single();

  if (server.error) throw server.error;
  return server.data.id as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const admin = getServiceClient();
  if (!admin) {
    return jsonResponse({ error: "Server misconfigured: service role key is not set" }, 500);
  }

  const adminCheck = await requireAdminCaller(req, admin);
  if (adminCheck instanceof Response) return adminCheck;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const allowMock = Deno.env.get("WHM_SYNC_ALLOW_MOCK") === "true";
  const useMock = body.mock_mode === true && allowMock;
  if (body.mock_mode === true && !allowMock) {
    return jsonResponse({ error: "Mock mode is not enabled for this environment" }, 403);
  }

  const serverId = await getOrCreateServer(admin);
  const syncRun = await admin
    .from("whm_sync_runs")
    .insert({ server_id: serverId, status: "running" })
    .select("id")
    .single();

  if (syncRun.error) {
    console.error("[whm-sync] failed to create sync run");
    return jsonResponse({ error: "Failed to create sync run" }, 500);
  }

  const syncRunId = syncRun.data.id as string;

  try {
    const accounts = useMock ? mockWhmAccounts() : await fetchWhmAccounts();
    const matchIndexes = await loadMatchIndexes(admin);
    let domainsSeen = 0;
    let matchedAccounts = 0;
    let unmatchedAccounts = 0;

    for (const account of accounts) {
      const match = matchAccount(
        account,
        matchIndexes.hostingByUser,
        matchIndexes.domainByName,
        matchIndexes.clientByWebsiteDomain,
      );

      if (match.match_status === "matched") matchedAccounts += 1;
      if (match.match_status === "unmatched") unmatchedAccounts += 1;
      domainsSeen += account.domains.length;

      const upsertedAccount = await admin
        .from("whm_accounts")
        .upsert(
          {
            server_id: serverId,
            sync_run_id: syncRunId,
            whm_user: account.whm_user,
            primary_domain: account.primary_domain,
            owner: account.owner,
            plan: account.plan,
            ip_address: account.ip_address,
            status: account.status,
            raw_status: account.raw_status,
            disk_used_mb: account.disk_used_mb,
            disk_quota_mb: account.disk_quota_mb,
            bandwidth_used_mb: account.bandwidth_used_mb,
            bandwidth_quota_mb: account.bandwidth_quota_mb,
            match_status: match.match_status,
            matched_client_id: match.matched_client_id,
            match_confidence: match.match_confidence,
            last_seen_at: new Date().toISOString(),
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "server_id,whm_user" },
        )
        .select("id")
        .single();

      if (upsertedAccount.error) throw upsertedAccount.error;

      const whmAccountId = upsertedAccount.data.id as string;
      if (account.domains.length > 0) {
        const domainRows = account.domains.map((domain) => ({
          whm_account_id: whmAccountId,
          domain_name: domain.domain_name,
          domain_type: domain.domain_type,
          document_root: domain.document_root,
          last_seen_at: new Date().toISOString(),
        }));

        const insertedDomains = await admin.from("whm_domain_observations").insert(domainRows);
        if (insertedDomains.error) throw insertedDomains.error;
      }
    }

    const finishedAt = new Date().toISOString();
    const summary = {
      accounts_seen: accounts.length,
      domains_seen: domainsSeen,
      matched_accounts: matchedAccounts,
      unmatched_accounts: unmatchedAccounts,
      sync_run_id: syncRunId,
    };

    const finalRun = await admin
      .from("whm_sync_runs")
      .update({ ...summary, status: "success", finished_at: finishedAt })
      .eq("id", syncRunId);
    if (finalRun.error) throw finalRun.error;

    const serverUpdate = await admin
      .from("whm_servers")
      .update({ last_sync_at: finishedAt })
      .eq("id", serverId);
    if (serverUpdate.error) throw serverUpdate.error;

    return jsonResponse(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    console.error("[whm-sync] sync failed");
    await admin
      .from("whm_sync_runs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error_summary: message.slice(0, 500),
      })
      .eq("id", syncRunId);

    return jsonResponse({ error: "WHM read-only sync failed", sync_run_id: syncRunId }, 500);
  }
});
