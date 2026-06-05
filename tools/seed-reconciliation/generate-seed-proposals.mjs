#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const INPUT_DIR = "D:\\KBCC-SEED-RECONCILIATION\\inputs";
const OUTPUT_DIR = "D:\\KBCC-SEED-RECONCILIATION\\outputs";

const today = new Date().toISOString().slice(0, 10);
const createdAt = new Date().toISOString();
const sourceBatchId = `initial-server-client-seed-${today}`;

const files = {
  domainsRenewal: "domains-renewal.csv",
  clientServices: "kbcc-client-services-export.csv",
  clients: "kbcc-clients-export.csv",
  domains: "kbcc-domains-export.csv",
  hostingAccounts: "kbcc-hosting-accounts-export.csv",
  mailboxes: "kbcc-mailboxes-export.csv",
  zohoCustomers: "zoho-customers-raw-export.csv",
  zohoInvoices: "zoho-invoices-raw-export.csv",
  whmAccounts: "whm-accounts-export.csv",
  whmDomainObservations: "whm-domain-observations-export.csv",
};

const optionalFiles = new Set([
  files.whmAccounts,
  files.whmDomainObservations,
  files.clientServices,
  files.mailboxes,
  files.zohoCustomers,
  files.zohoInvoices,
]);

const outputFields = [
  "proposal_id",
  "source_batch_id",
  "domain_name",
  "contact_name",
  "registrar_status",
  "auto_renew",
  "expiry_date",
  "renewal_risk",
  "existing_kbcc_domain_id",
  "existing_kbcc_client_id",
  "existing_kbcc_client_name",
  "existing_hosting_account_id",
  "suggested_client_id",
  "suggested_client_name",
  "confidence",
  "match_reason",
  "conflict_reasons",
  "proposed_actions",
  "review_status",
  "admin_decision",
  "reviewed_by",
  "reviewed_at",
  "notes",
  "created_at",
  "whm_account_id",
  "whm_sync_run_id",
  "whm_user",
  "whm_primary_domain",
  "whm_observed_domains",
  "whm_status",
  "whm_plan",
  "whm_disk_used_mb",
  "whm_disk_quota_mb",
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        value += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        value += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (char !== "\r") {
      value += char;
    }
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  if (rows.length === 0) {
    return { headers: [], records: [] };
  }

  const headers = rows[0].map((header) => header.trim().replace(/^\uFEFF/, ""));
  const records = rows
    .slice(1)
    .filter((line) => line.some((cell) => cell.trim() !== ""))
    .map((line) => Object.fromEntries(headers.map((header, index) => [header, line[index] ?? ""])));

  return { headers, records };
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function toCsv(records, headers) {
  return [
    headers.map(csvEscape).join(","),
    ...records.map((record) => headers.map((header) => csvEscape(record[header])).join(",")),
  ].join("\n");
}

function normalizeDomain(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split("?")[0]
    .replace(/\.$/, "");
}

function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeName(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(pty|ltd|cc|inc|company|co|the)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDate(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const isoLike = Date.parse(raw);
  if (!Number.isNaN(isoLike)) {
    return new Date(isoLike);
  }

  const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]) - 1;
  const yearValue = Number(match[3]);
  const year = yearValue < 100 ? 2000 + yearValue : yearValue;
  const date = new Date(Date.UTC(year, month, day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function renewalRisk(value) {
  const date = parseDate(value);
  if (!date) return "unknown";

  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const expiryUtc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const days = Math.ceil((expiryUtc - todayUtc) / 86_400_000);

  if (days < 0) return "expired";
  if (days <= 30) return "expires_soon_30_days";
  if (days <= 60) return "expires_soon_60_days";
  return "ok";
}

function firstValue(row, keys) {
  for (const key of keys) {
    if (row[key] != null && String(row[key]).trim() !== "") return row[key];
  }
  return "";
}

function clientName(client) {
  return firstValue(client, ["business_name", "trading_name", "full_name", "email"]);
}

function domainFromClient(client) {
  return normalizeDomain(firstValue(client, ["website_url", "website", "domain_name", "domain"]));
}

function addMapEntry(map, key, value) {
  if (!key) return;
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

function uniqueById(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const id = row.id || JSON.stringify(row);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function chooseConfidence({ existingDomain, hostingMatches, clientDomainMatches, nameMatches, conflictClientIds }) {
  if (conflictClientIds.size > 1) return "conflict";
  if (existingDomain?.client_id) return "high";
  if (clientDomainMatches.length > 0) return "high";
  if (hostingMatches.length > 0 && nameMatches.length > 0) return "medium";
  if (hostingMatches.length > 0) return "medium";
  if (nameMatches.length > 0) return "low";
  return "none";
}

function proposedActions({ existingDomain, existingClientId, suggestedClientId, hostingMatches, risk, confidence }) {
  const actions = new Set();

  if (existingDomain) actions.add("verify_existing_domain");
  else actions.add("create_domain_record");

  if (existingClientId || suggestedClientId) actions.add("link_domain_to_existing_client");
  else actions.add("create_client_manually");

  if (hostingMatches.length > 0) actions.add("review_hosting_link");
  if (risk === "expired" || risk === "expires_soon_30_days" || risk === "expires_soon_60_days") {
    actions.add("review_renewal_risk");
  }
  if (confidence === "none") actions.add("defer");
  if (confidence === "conflict") actions.add("defer");

  return [...actions].join(";");
}

async function loadFile(fileName) {
  const filePath = path.join(INPUT_DIR, fileName);
  if (!existsSync(filePath)) {
    return { fileName, present: false, headers: [], records: [] };
  }

  const text = await readFile(filePath, "utf8");
  const parsed = parseCsv(text);
  return { fileName, present: true, ...parsed };
}

function parseZohoRows(rows) {
  return rows
    .map((row) => {
      if (!row.raw_data) return row;
      try {
        return { ...row, raw: JSON.parse(row.raw_data) };
      } catch {
        return row;
      }
    })
    .filter((row) => Object.keys(row).length > 0);
}

function findZohoMatches(domain, contactName, zohoCustomers) {
  const normalizedContact = normalizeName(contactName);
  return zohoCustomers.filter((row) => {
    const raw = row.raw ?? {};
    const name = normalizeName(raw.display_name || raw.company_name || row.display_name || row.company_name);
    const email = normalizeEmail(raw.email || row.email);
    const emailDomain = email.includes("@") ? normalizeDomain(email.split("@").pop()) : "";
    return (
      (emailDomain && emailDomain === domain) ||
      (normalizedContact && name && (name.includes(normalizedContact) || normalizedContact.includes(name)))
    );
  });
}

function buildReason(parts) {
  return parts.filter(Boolean).join("; ");
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const loadedEntries = await Promise.all(Object.values(files).map(loadFile));
  const loaded = Object.fromEntries(loadedEntries.map((entry) => [entry.fileName, entry]));

  const presentFiles = loadedEntries.filter((entry) => entry.present).map((entry) => entry.fileName);
  const missingOptionalFiles = loadedEntries
    .filter((entry) => !entry.present && optionalFiles.has(entry.fileName))
    .map((entry) => entry.fileName);
  const missingRequiredFiles = loadedEntries
    .filter((entry) => !entry.present && !optionalFiles.has(entry.fileName))
    .map((entry) => entry.fileName);

  if (missingRequiredFiles.length > 0) {
    throw new Error(`Missing required input files: ${missingRequiredFiles.join(", ")}`);
  }

  const domainsRenewal = loaded[files.domainsRenewal].records;
  const kbccDomains = loaded[files.domains].records;
  const kbccClients = loaded[files.clients].records;
  const hostingAccounts = loaded[files.hostingAccounts].records;
  const zohoCustomers = parseZohoRows(loaded[files.zohoCustomers].records);

  const domainIndex = new Map();
  for (const domain of kbccDomains) {
    addMapEntry(domainIndex, normalizeDomain(domain.domain_name), domain);
  }

  const hostingIndex = new Map();
  for (const account of hostingAccounts) {
    addMapEntry(hostingIndex, normalizeDomain(account.domain_name || account.primary_domain || account.cpanel_username), account);
    addMapEntry(hostingIndex, normalizeDomain(account.cpanel_username), account);
  }

  const clientDomainIndex = new Map();
  const clientNameIndex = kbccClients.map((client) => ({ client, normalizedName: normalizeName(clientName(client)) }));
  for (const client of kbccClients) {
    addMapEntry(clientDomainIndex, domainFromClient(client), client);
    const email = normalizeEmail(client.email);
    if (email.includes("@")) addMapEntry(clientDomainIndex, normalizeDomain(email.split("@").pop()), client);
  }

  const clientsById = new Map(kbccClients.map((client) => [client.id, client]));
  const proposals = domainsRenewal.map((row, index) => {
    const domain = normalizeDomain(row["Domain Name"]);
    const contactName = String(row["Contact Name"] ?? "").trim();
    const normalizedContact = normalizeName(contactName);
    const existingDomain = domainIndex.get(domain)?.[0] ?? null;
    const existingClient = existingDomain?.client_id ? clientsById.get(existingDomain.client_id) : null;
    const hostingMatches = uniqueById(hostingIndex.get(domain) ?? []);
    const hostingIds = new Set(hostingMatches.map((match) => match.id).filter(Boolean));
    if (existingDomain?.hosting_account_id) hostingIds.add(existingDomain.hosting_account_id);
    const clientDomainMatches = uniqueById(clientDomainIndex.get(domain) ?? []);
    const nameMatches = normalizedContact
      ? clientNameIndex
          .filter(({ normalizedName }) => normalizedName && (normalizedName.includes(normalizedContact) || normalizedContact.includes(normalizedName)))
          .map(({ client }) => client)
      : [];
    const zohoMatches = findZohoMatches(domain, contactName, zohoCustomers);

    const candidateClientIds = new Set();
    if (existingDomain?.client_id) candidateClientIds.add(existingDomain.client_id);
    for (const match of hostingMatches) if (match.client_id) candidateClientIds.add(match.client_id);
    for (const match of clientDomainMatches) if (match.id) candidateClientIds.add(match.id);
    for (const match of nameMatches) if (match.id) candidateClientIds.add(match.id);

    const confidence = chooseConfidence({
      existingDomain,
      hostingMatches,
      clientDomainMatches,
      nameMatches,
      conflictClientIds: candidateClientIds,
    });

    const suggestedClient = existingClient || clientDomainMatches[0] || (candidateClientIds.size === 1 ? clientsById.get([...candidateClientIds][0]) : null) || null;
    const risk = renewalRisk(row["Expiry Date"]);
    const conflictReasons = [];
    if (candidateClientIds.size > 1) conflictReasons.push(`multiple candidate client ids: ${[...candidateClientIds].join("|")}`);
    if (existingDomain?.client_id && hostingMatches.some((match) => match.client_id && match.client_id !== existingDomain.client_id)) {
      conflictReasons.push("existing domain client differs from hosting account client");
    }

    const reason = buildReason([
      existingDomain ? "exact domain exists in KBCC domains" : "",
      existingDomain?.hosting_account_id ? "existing KBCC domain has hosting account link" : "",
      hostingMatches.length > 0 ? "domain matched KBCC hosting account candidate" : "",
      clientDomainMatches.length > 0 ? "domain matched KBCC client website/email domain" : "",
      nameMatches.length > 0 ? "contact name loosely matched KBCC client name" : "",
      zohoMatches.length > 0 ? "Zoho customer candidate found" : "",
      risk !== "ok" ? `renewal risk: ${risk}` : "",
      confidence === "none" ? "no useful match found" : "",
    ]);

    return {
      proposal_id: `PROP-${String(index + 1).padStart(4, "0")}`,
      source_batch_id: sourceBatchId,
      domain_name: domain,
      contact_name: contactName,
      registrar_status: String(row["Status"] ?? "").trim(),
      auto_renew: String(row["Auto Renew"] ?? "").trim(),
      expiry_date: String(row["Expiry Date"] ?? "").trim(),
      renewal_risk: risk,
      existing_kbcc_domain_id: existingDomain?.id ?? "",
      existing_kbcc_client_id: existingDomain?.client_id ?? "",
      existing_kbcc_client_name: existingClient ? clientName(existingClient) : "",
      existing_hosting_account_id: [...hostingIds].join(";"),
      suggested_client_id: suggestedClient?.id ?? "",
      suggested_client_name: suggestedClient ? clientName(suggestedClient) : "",
      confidence,
      match_reason: reason,
      conflict_reasons: conflictReasons.join("; "),
      proposed_actions: proposedActions({
        existingDomain,
        existingClientId: existingDomain?.client_id,
        suggestedClientId: suggestedClient?.id,
        hostingMatches,
        risk,
        confidence,
      }),
      review_status: "pending_review",
      admin_decision: "",
      reviewed_by: "",
      reviewed_at: "",
      notes: "",
      created_at: createdAt,
      whm_account_id: "",
      whm_sync_run_id: "",
      whm_user: "",
      whm_primary_domain: "",
      whm_observed_domains: "",
      whm_status: "",
      whm_plan: "",
      whm_disk_used_mb: "",
      whm_disk_quota_mb: "",
    };
  });

  const csvPath = path.join(OUTPUT_DIR, `initial-server-client-seed-proposals-${today}.csv`);
  const jsonPath = path.join(OUTPUT_DIR, `initial-server-client-seed-proposals-${today}.json`);
  await writeFile(csvPath, `${toCsv(proposals, outputFields)}\n`, "utf8");
  await writeFile(jsonPath, `${JSON.stringify(proposals, null, 2)}\n`, "utf8");

  const confidenceBreakdown = proposals.reduce((acc, proposal) => {
    acc[proposal.confidence] = (acc[proposal.confidence] ?? 0) + 1;
    return acc;
  }, {});

  const renewalRiskBreakdown = proposals.reduce((acc, proposal) => {
    acc[proposal.renewal_risk] = (acc[proposal.renewal_risk] ?? 0) + 1;
    return acc;
  }, {});

  const rowCounts = Object.fromEntries(loadedEntries.map((entry) => [entry.fileName, entry.present ? entry.records.length : null]));
  const headers = Object.fromEntries(loadedEntries.map((entry) => [entry.fileName, entry.headers]));

  console.log(JSON.stringify({
    inputDir: INPUT_DIR,
    outputDir: OUTPUT_DIR,
    inputFilesFound: presentFiles,
    missingOptionalFiles,
    missingRequiredFiles,
    rowCounts,
    detectedHeaders: headers,
    zohoStatus: {
      customers: loaded[files.zohoCustomers].records.length === 0 ? "empty" : "has_data",
      invoices: loaded[files.zohoInvoices].records.length === 0 ? "empty" : "has_data",
    },
    proposalsGenerated: proposals.length,
    confidenceBreakdown,
    renewalRiskBreakdown,
    outputFiles: {
      csv: csvPath,
      json: jsonPath,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
