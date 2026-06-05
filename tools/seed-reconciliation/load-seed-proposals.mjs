#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const DEFAULT_INPUT_FILE = "D:\\KBCC-SEED-RECONCILIATION\\outputs\\initial-server-client-seed-proposals-2026-06-05.json";
const OUTPUT_DIR = "D:\\KBCC-SEED-RECONCILIATION\\outputs";
const LOCAL_DB_CONTAINER_PREFIX = "supabase_db_";

const execFileAsync = promisify(execFile);

const REQUIRED_FIELDS = [
  "proposal_id",
  "source_batch_id",
  "domain_name",
  "renewal_risk",
  "confidence",
  "review_status",
];

const UUID_FIELDS = [
  "existing_kbcc_domain_id",
  "existing_kbcc_client_id",
  "existing_hosting_account_id",
  "suggested_client_id",
  "reviewed_by",
  "whm_account_id",
  "whm_sync_run_id",
];

const ALLOWED_CONFIDENCE = new Set(["high", "medium", "low", "none", "conflict"]);
const ALLOWED_RENEWAL_RISK = new Set(["expired", "expires_soon_30_days", "expires_soon_60_days", "ok", "unknown"]);
const ALLOWED_REVIEW_STATUS = new Set([
  "pending_review",
  "confirmed_existing_client",
  "manual_create_required",
  "deferred",
  "ignored",
  "conflict",
]);
const ALLOWED_ADMIN_DECISION = new Set([
  "attach_to_existing",
  "create_client_manually",
  "create_service_only",
  "create_domain_only",
  "create_hosting_only",
  "ignore",
  "defer",
]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseArgs(argv) {
  const args = { file: DEFAULT_INPUT_FILE, checkDb: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--file") {
      const value = argv[i + 1];
      if (!value) throw new Error("--file requires a path");
      args.file = value;
      i += 1;
    } else if (arg === "--check-db") {
      args.checkDb = true;
    } else if (arg === "--apply") {
      throw new Error("Apply mode is not implemented in this phase.");
    } else {
      throw new Error(`Unsupported argument: ${arg}. This validator supports only --file <path> and --check-db.`);
    }
  }
  return args;
}

function isBlank(value) {
  return value == null || String(value).trim() === "";
}

function increment(map, key) {
  const label = isBlank(key) ? "blank" : String(key);
  map[label] = (map[label] ?? 0) + 1;
}

function parseDateForReport(value) {
  if (isBlank(value)) return { status: "null", value: null };
  const parsed = Date.parse(String(value).trim());
  if (Number.isNaN(parsed)) return { status: "invalid", value: null };
  return { status: "valid", value: new Date(parsed).toISOString() };
}

function normalizeProposedActions(value) {
  if (Array.isArray(value)) {
    return {
      status: "array",
      actions: value.map((item) => String(item).trim()).filter(Boolean),
    };
  }

  if (isBlank(value)) {
    return { status: "blank", actions: [] };
  }

  return {
    status: "string_split",
    actions: String(value).split(";").map((item) => item.trim()).filter(Boolean),
  };
}

function safeRowLabel(row, index) {
  return {
    row_index: index,
    proposal_id: isBlank(row?.proposal_id) ? "" : String(row.proposal_id),
    domain_name: isBlank(row?.domain_name) ? "" : String(row.domain_name),
  };
}

function timestampForFile(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

async function loadProposalRows(inputPath) {
  if (!existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const text = await readFile(inputPath, "utf8");
  let rows;
  try {
    rows = JSON.parse(text);
  } catch (error) {
    throw new Error(`JSON parse failed: ${error instanceof Error ? error.message : "unknown error"}`);
  }

  if (!Array.isArray(rows)) {
    throw new Error("Input JSON root must be an array.");
  }

  return rows;
}

function validateRows(rows) {
  const sourceBatchIds = new Set();
  const duplicateKeys = new Map();
  const invalidRows = [];
  const confidenceBreakdown = {};
  const renewalRiskBreakdown = {};
  const reviewStatusBreakdown = {};
  const proposedActionBreakdown = {};
  const dateParsingSummary = { valid: 0, null: 0, invalid: 0 };
  const uuidSummary = { blankWouldBecomeNull: 0, validNonblank: 0, malformedNonblank: 0 };
  const proposedActionsSummary = { stringSplit: 0, arrayPreserved: 0, blank: 0 };

  rows.forEach((row, index) => {
    const reasons = [];

    if (!row || typeof row !== "object" || Array.isArray(row)) {
      invalidRows.push({ ...safeRowLabel(row, index), reasons: ["row is not an object"] });
      return;
    }

    for (const field of REQUIRED_FIELDS) {
      if (isBlank(row[field])) reasons.push(`missing required field: ${field}`);
    }

    if (!isBlank(row.source_batch_id)) sourceBatchIds.add(String(row.source_batch_id));

    const duplicateKey = `${row.source_batch_id ?? ""}::${row.proposal_id ?? ""}`;
    duplicateKeys.set(duplicateKey, (duplicateKeys.get(duplicateKey) ?? 0) + 1);

    if (!isBlank(row.confidence) && !ALLOWED_CONFIDENCE.has(String(row.confidence))) {
      reasons.push(`invalid confidence: ${row.confidence}`);
    }
    if (!isBlank(row.renewal_risk) && !ALLOWED_RENEWAL_RISK.has(String(row.renewal_risk))) {
      reasons.push(`invalid renewal_risk: ${row.renewal_risk}`);
    }
    if (!isBlank(row.review_status) && !ALLOWED_REVIEW_STATUS.has(String(row.review_status))) {
      reasons.push(`invalid review_status: ${row.review_status}`);
    }
    if (!isBlank(row.admin_decision) && !ALLOWED_ADMIN_DECISION.has(String(row.admin_decision))) {
      reasons.push(`invalid admin_decision: ${row.admin_decision}`);
    }

    increment(confidenceBreakdown, row.confidence);
    increment(renewalRiskBreakdown, row.renewal_risk);
    increment(reviewStatusBreakdown, row.review_status);

    const dateReport = parseDateForReport(row.expiry_date);
    dateParsingSummary[dateReport.status] += 1;
    if (dateReport.status === "invalid") reasons.push("expiry_date would be invalid");

    for (const field of UUID_FIELDS) {
      if (isBlank(row[field])) {
        uuidSummary.blankWouldBecomeNull += 1;
      } else if (UUID_PATTERN.test(String(row[field]).trim())) {
        uuidSummary.validNonblank += 1;
      } else {
        uuidSummary.malformedNonblank += 1;
        reasons.push(`${field} is malformed nonblank UUID-ish value`);
      }
    }

    const proposedActions = normalizeProposedActions(row.proposed_actions);
    if (proposedActions.status === "string_split") proposedActionsSummary.stringSplit += 1;
    if (proposedActions.status === "array") proposedActionsSummary.arrayPreserved += 1;
    if (proposedActions.status === "blank") proposedActionsSummary.blank += 1;
    for (const action of proposedActions.actions) increment(proposedActionBreakdown, action);

    if (reasons.length > 0) {
      invalidRows.push({ ...safeRowLabel(row, index), reasons });
    }
  });

  const duplicateEntries = [...duplicateKeys.entries()]
    .filter(([key, count]) => key !== "::" && count > 1)
    .map(([key, count]) => {
      const [source_batch_id, proposal_id] = key.split("::");
      return { source_batch_id, proposal_id, count };
    });

  for (const duplicate of duplicateEntries) {
    rows.forEach((row, index) => {
      if (row?.source_batch_id === duplicate.source_batch_id && row?.proposal_id === duplicate.proposal_id) {
        invalidRows.push({
          ...safeRowLabel(row, index),
          reasons: [`duplicate source_batch_id + proposal_id: ${duplicate.source_batch_id} / ${duplicate.proposal_id}`],
        });
      }
    });
  }

  const invalidRowKeys = new Set(invalidRows.map((row) => `${row.row_index}:${row.proposal_id}`));
  const invalidRowCount = invalidRowKeys.size;

  return {
    total_rows: rows.length,
    source_batch_ids: [...sourceBatchIds].sort(),
    duplicate_count: duplicateEntries.reduce((sum, entry) => sum + entry.count - 1, 0),
    duplicate_keys: duplicateEntries,
    invalid_row_count: invalidRowCount,
    valid_row_count: rows.length - invalidRowCount,
    confidence_breakdown: confidenceBreakdown,
    renewal_risk_breakdown: renewalRiskBreakdown,
    review_status_breakdown: reviewStatusBreakdown,
    proposed_action_breakdown: proposedActionBreakdown,
    proposed_actions_summary: proposedActionsSummary,
    date_parsing_summary: dateParsingSummary,
    uuid_summary: uuidSummary,
    invalid_rows: invalidRows,
    future_loader_notes: [
      "proposed_actions strings would be split on ';' before database load",
      "blank UUID-ish fields would become null before database load",
      "raw_payload would preserve each original proposal row",
    ],
  };
}

async function findLocalDbContainer() {
  const { stdout } = await execFileAsync("docker", [
    "ps",
    "--filter",
    `name=${LOCAL_DB_CONTAINER_PREFIX}`,
    "--format",
    "{{.Names}}\t{{.Status}}",
  ]);
  const rows = stdout.trim().split(/\r?\n/).filter(Boolean);
  const healthy = rows
    .map((line) => {
      const [name, status] = line.split("\t");
      return { name, status };
    })
    .find((row) => row.name?.startsWith(LOCAL_DB_CONTAINER_PREFIX) && row.status?.toLowerCase().includes("healthy"));

  if (!healthy) {
    throw new Error("Safe local DB check cannot run: no healthy local Supabase DB container was found.");
  }

  return healthy.name;
}

async function localPsql(containerName, sql) {
  const { stdout } = await execFileAsync("docker", [
    "exec",
    containerName,
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-t",
    "-A",
    "-c",
    sql,
  ]);
  return stdout.trim();
}

function sqlTextArray(values) {
  const escaped = values.map((value) => `'${String(value).replaceAll("'", "''")}'`);
  return `ARRAY[${escaped.join(",")}]::text[]`;
}

async function checkLocalDb(validation, rows) {
  const containerName = await findLocalDbContainer();
  const tableExists = (await localPsql(
    containerName,
    "select to_regclass('public.seed_reconciliation_proposals') is not null;",
  )) === "t";

  if (!tableExists) {
    return {
      local_db_checked: true,
      staging_table_exists: false,
      existing_staging_rows_for_batch: 0,
      would_insert: validation.valid_row_count,
      would_update: 0,
      db_check_note: "Staging table does not exist in the local database. No database writes were attempted.",
    };
  }

  const batchIds = validation.source_batch_ids;
  if (batchIds.length === 0) {
    return {
      local_db_checked: true,
      staging_table_exists: true,
      existing_staging_rows_for_batch: 0,
      would_insert: 0,
      would_update: 0,
      db_check_note: "No source_batch_id values found in JSON. No database writes were attempted.",
    };
  }

  const existingOutput = await localPsql(
    containerName,
    `select source_batch_id || E'\\t' || proposal_id from public.seed_reconciliation_proposals where source_batch_id = any(${sqlTextArray(batchIds)});`,
  );
  const existingKeys = new Set(existingOutput.split(/\r?\n/).filter(Boolean));
  const validRows = rows.filter((row, index) => {
    const key = `${index}:${row?.proposal_id ?? ""}`;
    return !validation.invalid_rows.some((invalid) => `${invalid.row_index}:${invalid.proposal_id}` === key);
  });
  const wouldUpdate = validRows.filter((row) => existingKeys.has(`${row.source_batch_id}\t${row.proposal_id}`)).length;
  const wouldInsert = validRows.length - wouldUpdate;

  return {
    local_db_checked: true,
    staging_table_exists: true,
    existing_staging_rows_for_batch: existingKeys.size,
    would_insert: wouldInsert,
    would_update: wouldUpdate,
    db_check_note: "Read-only local staging table check completed. No database writes were attempted.",
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(args.file);
  const generatedAt = new Date().toISOString();
  const reportKind = args.checkDb ? "check" : "validation";
  const reportPath = path.join(
    OUTPUT_DIR,
    `seed-proposal-load-${reportKind}-report-${timestampForFile(new Date())}.json`,
  );

  const rows = await loadProposalRows(inputPath);
  const validation = validateRows(rows);
  const dbCheck = args.checkDb ? await checkLocalDb(validation, rows) : {};
  const safetyStatement = args.checkDb
    ? "Local DB read/check mode used read-only metadata/select queries only. No DB write, migration, sync, external call, client creation, domain creation, hosting change, invoice change, DNS change, or ownership link was performed."
    : "No Supabase client was created. No DB connection, DB write, migration, sync, external call, client creation, domain creation, hosting change, invoice change, DNS change, or ownership link was performed.";

  const report = {
    input_file_path: inputPath,
    generated_at: generatedAt,
    mode: args.checkDb ? "dry-run validation plus local DB read/check only" : "dry-run validation/report only",
    ...validation,
    ...dbCheck,
    safety_statement: safetyStatement,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({
    input_file_path: inputPath,
    total_rows: report.total_rows,
    source_batch_ids: report.source_batch_ids,
    duplicate_count: report.duplicate_count,
    invalid_row_count: report.invalid_row_count,
    valid_row_count: report.valid_row_count,
    confidence_breakdown: report.confidence_breakdown,
    renewal_risk_breakdown: report.renewal_risk_breakdown,
    review_status_breakdown: report.review_status_breakdown,
    proposed_action_breakdown: report.proposed_action_breakdown,
    date_parsing_summary: report.date_parsing_summary,
    ...(args.checkDb ? {
      local_db_checked: report.local_db_checked,
      staging_table_exists: report.staging_table_exists,
      existing_staging_rows_for_batch: report.existing_staging_rows_for_batch,
      would_insert: report.would_insert,
      would_update: report.would_update,
    } : {}),
    report_file_path: reportPath,
    safety_statement: report.safety_statement,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
