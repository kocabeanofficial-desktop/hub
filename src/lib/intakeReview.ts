import type { DbIntakeSubmission } from "@/types/database";
import { BUSINESS_EMAIL_PACKAGES, EMAIL_MIGRATION_PACKAGE, isBusinessEmailPackage } from "@/lib/serviceTypeConfig";

export type IntakeReviewValues = Record<string, string>;

export const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

export const asString = (value: unknown): string =>
  typeof value === "string" ? value : typeof value === "number" || typeof value === "boolean" ? String(value) : "";

export const joinArray = (value: unknown): string => (Array.isArray(value) ? value.filter(Boolean).map(String).join(", ") : "");

export const getPayloadBody = (submission: DbIntakeSubmission): Record<string, unknown> => {
  const payload = asRecord(submission.raw_payload);
  return asRecord(payload?.body) || payload || {};
};

export const readPath = (source: Record<string, unknown> | null, path: string): string => {
  if (!source) return "";
  let current: unknown = source;
  for (const part of path.split(".")) current = asRecord(current)?.[part];
  return asString(current) || joinArray(current);
};

export type PayloadValueResult = {
  value: string;
  path: string;
};

const directIntakeValue = (submission: DbIntakeSubmission, key: string) => {
  const direct = (submission as unknown as Record<string, unknown>)[key];
  return asString(direct) || joinArray(direct);
};

const valueFromSource = (source: Record<string, unknown> | null, sourcePath: string, key: string): PayloadValueResult | null => {
  if (!source) return null;
  const value = readPath(source, key);
  return value ? { value, path: `${sourcePath}.${key}` } : null;
};

export const getPayloadValue = (submission: DbIntakeSubmission, keys: string[]): PayloadValueResult => {
  const rawPayload = asRecord(submission.raw_payload);
  const body = asRecord(rawPayload?.body);
  const containers: { path: string; source: Record<string, unknown> | null }[] = [
    { path: "intake", source: submission as unknown as Record<string, unknown> },
    { path: "raw_payload", source: rawPayload },
    { path: "raw_payload.body", source: body },
    { path: "raw_payload.payload", source: asRecord(rawPayload?.payload) },
    { path: "raw_payload.formData", source: asRecord(rawPayload?.formData) },
    { path: "raw_payload.data", source: asRecord(rawPayload?.data) },
    { path: "raw_payload.submission", source: asRecord(rawPayload?.submission) },
    { path: "raw_payload.body.payload", source: asRecord(body?.payload) },
    { path: "raw_payload.body.formData", source: asRecord(body?.formData) },
    { path: "raw_payload.body.review_overrides", source: asRecord(body?.review_overrides) },
    { path: "raw_payload.review_overrides", source: asRecord(rawPayload?.review_overrides) },
    { path: "raw_payload.contact_details", source: asRecord(rawPayload?.contact_details) },
    { path: "raw_payload.body.contact_details", source: asRecord(body?.contact_details) },
    { path: "raw_payload.email_requirements", source: asRecord(rawPayload?.email_requirements) },
    { path: "raw_payload.body.email_requirements", source: asRecord(body?.email_requirements) },
    { path: "raw_payload.domain_details", source: asRecord(rawPayload?.domain_details) },
    { path: "raw_payload.body.domain_details", source: asRecord(body?.domain_details) },
  ];

  for (const container of containers) {
    for (const key of keys) {
      const result = valueFromSource(container.source, container.path, key);
      if (result) return result;
    }
  }

  return { value: "", path: "" };
};

export const reviewValue = (submission: DbIntakeSubmission, paths: string[]): string => {
  const rawPayload = asRecord(submission.raw_payload);
  const body = asRecord(rawPayload?.body);
  const bodySource = body || rawPayload || {};
  const rootReviewOverrides = asRecord(rawPayload?.review_overrides);
  const bodyReviewOverrides = asRecord(body?.review_overrides);

  for (const path of paths) {
    if (path.startsWith("review_overrides.")) {
      const overridePath = path.replace(/^review_overrides\./, "");
      const value = readPath(rootReviewOverrides, overridePath) || readPath(bodyReviewOverrides, overridePath);
      if (value) return value;
      continue;
    }

    if (path.startsWith("intake.")) {
      const value = directIntakeValue(submission, path.replace(/^intake\./, ""));
      if (value) return value;
      continue;
    }

    if (path.startsWith("raw_payload.body.review_overrides.")) {
      const value = readPath(bodyReviewOverrides, path.replace(/^raw_payload\.body\.review_overrides\./, ""));
      if (value) return value;
      continue;
    }

    if (path.startsWith("raw_payload.body.")) {
      const value = readPath(bodySource, path.replace(/^raw_payload\.body\./, ""));
      if (value) return value;
      continue;
    }

    if (path.startsWith("raw_payload.")) {
      const value = readPath(rawPayload, path.replace(/^raw_payload\./, ""));
      if (value) return value;
      continue;
    }
  }

  return "";
};

export const getReviewField = (submission: DbIntakeSubmission, key: string, ...fallbackPaths: string[]) => {
  const payloadValue = getPayloadValue(submission, [key]).value;
  if (payloadValue) return payloadValue;

  const standardPaths = [
    `review_overrides.${key}`,
    `raw_payload.body.review_overrides.${key}`,
    `intake.${key}`,
    `raw_payload.${key}`,
    `raw_payload.body.${key}`,
    `raw_payload.formData.${key}`,
    `raw_payload.payload.${key}`,
    ...fallbackPaths,
  ];
  return reviewValue(submission, standardPaths);
};

export const getContactFullName = (submission: DbIntakeSubmission) =>
  getPayloadValue(submission, ["full_name", "name", "contact_name", "client_name", "customer_name", "submitter_name"]).value;

export const getContactEmail = (submission: DbIntakeSubmission) =>
  getPayloadValue(submission, ["email", "contact_email", "client_email", "customer_email", "submitter_email"]).value;

export const getContactPhone = (submission: DbIntakeSubmission) =>
  getPayloadValue(submission, ["whatsapp_number", "whatsapp", "phone", "mobile", "contact_number", "phone_number", "submitter_phone", "phone_whatsapp"]).value;

export const getBusinessName = (submission: DbIntakeSubmission) =>
  getPayloadValue(submission, ["business_name", "company_name", "company", "client_business_name"]).value;

export const getAdminContactEmail = (submission: DbIntakeSubmission) =>
  getPayloadValue(submission, ["admin_contact_email", "main_admin_mailbox", "account_email", "login_email"]).value;

export const getDetectedContactSummary = (submission: DbIntakeSubmission) => [
  { label: "Detected full name", ...getPayloadValue(submission, ["full_name", "name", "contact_name", "client_name", "customer_name", "submitter_name"]) },
  { label: "Detected email", ...getPayloadValue(submission, ["email", "contact_email", "client_email", "customer_email", "submitter_email"]) },
  { label: "Detected WhatsApp/phone", ...getPayloadValue(submission, ["whatsapp_number", "whatsapp", "phone", "mobile", "contact_number", "phone_number", "submitter_phone", "phone_whatsapp"]) },
  { label: "Detected business name", ...getPayloadValue(submission, ["business_name", "company_name", "company", "client_business_name"]) },
  { label: "Detected admin contact email", ...getPayloadValue(submission, ["admin_contact_email", "main_admin_mailbox", "account_email", "login_email"]) },
];

export const DISPLAY_LABELS: Record<string, string> = {
  new_domain: "New domain",
  existing_domain: "Existing domain",
  unsure: "Not sure / needs review",
  available: "Available",
  unavailable: "Appears unavailable",
  manual_review: "Manual review needed",
  yes: "Yes",
  no: "No",
  not_applicable: "Not applicable",
  pending_review: "Pending review",
  no_match_found: "No match found",
  possible_existing_client: "Possible existing client",
  existing_pending_enquiry: "Existing pending enquiry",
  manual_review_needed: "Manual review needed",
  business_email_10: "Business Email 10",
  business_email_30: "Business Email 30",
  business_email_50: "Business Email 50",
  email_migration_setup: "Email Migration & Setup",
};

export const displayLabel = (value: string | null | undefined) => {
  if (!value) return "";
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");
  return DISPLAY_LABELS[normalized] || value;
};

export const formatMonthlyPrice = (value: string | number | null | undefined) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const cleaned = raw.replace(/\/month$/i, "").trim();
  const withCurrency = cleaned.toUpperCase().startsWith("R") ? cleaned : `R${cleaned}`;
  return `${withCurrency}/month`;
};

export const buildDomainNote = (values: IntakeReviewValues) => {
  const choice = values.domain_choice;
  const desiredDomain = values.desired_domain;
  const existingDomain = values.existing_domain;
  const checkStatus = values.domain_check_status;
  const statusLabel = displayLabel(checkStatus).toLowerCase();
  const parts: string[] = [];

  if (choice === "new_domain" && desiredDomain) {
    parts.push(`New domain requested - ${desiredDomain}${checkStatus === "available" ? " appears available" : ""}. Final registration pending Koca Bean review.`);
  } else if (choice === "new_domain") {
    parts.push("New domain requested. Final registration pending Koca Bean review.");
  } else if (choice === "existing_domain" && existingDomain) {
    parts.push(`Existing domain connection / transfer review - ${existingDomain}.`);
  } else if (choice === "unsure") {
    parts.push("Domain status needs review.");
  }

  if (checkStatus === "unavailable") parts.push("Domain appears unavailable. Client may need to choose another domain.");
  if (checkStatus === "manual_review") parts.push("Domain requires manual review.");
  if (!parts.length && checkStatus) parts.push(`Domain check status: ${statusLabel}.`);

  return parts.join(" ");
};

export const buildZohoNotes = (values: IntakeReviewValues) => {
  const lines = [
    `Selected package: ${displayLabel(values.package_label || values.selected_package)}`,
    `Mailbox limit: ${values.mailbox_limit}`,
    `Required business email addresses: ${values.required_email_addresses}`,
    `Domain choice: ${displayLabel(values.domain_choice)}`,
    `Domain check status: ${displayLabel(values.domain_check_status)}`,
    `Domain check message: ${values.domain_check_message}`,
    `Admin notes: ${values.notes}`,
  ];
  return lines.filter((line) => !line.endsWith(": ")).join(" | ");
};

export const buildInitialEmailReviewValues = (submission: DbIntakeSubmission): IntakeReviewValues => {
  const selectedPackage = getReviewField(submission, "selected_package", "raw_payload.selected_plan", "raw_payload.body.selected_plan", "raw_payload.package_type", "raw_payload.body.package_type");
  const packageConfig = isBusinessEmailPackage(selectedPackage) ? BUSINESS_EMAIL_PACKAGES[selectedPackage] : null;
  const values: IntakeReviewValues = {
    full_name: getContactFullName(submission),
    business_name: getBusinessName(submission),
    email: getContactEmail(submission),
    whatsapp_number: getContactPhone(submission),
    admin_contact_email: getAdminContactEmail(submission),
    selected_package: selectedPackage,
    package_label: getReviewField(submission, "package_label") || (packageConfig ? packageConfig.label : displayLabel(selectedPackage)),
    mailbox_limit: getReviewField(submission, "mailbox_limit") || (packageConfig ? String(packageConfig.mailboxLimit) : ""),
    package_price_monthly: getReviewField(submission, "package_price_monthly") || (packageConfig ? String(packageConfig.monthlyPrice) : ""),
    notes: getReviewField(submission, "notes", "intake.final_notes", "intake.additional_notes"),
  };

  [
    "domain_choice",
    "desired_domain",
    "existing_domain",
    "domain_extension",
    "domain_access_status",
    "epp_auth_code_status",
    "domain_check_status",
    "domain_check_message",
    "required_email_addresses",
    "main_admin_mailbox",
    "current_email_addresses",
    "current_email_provider",
    "domain_login_access",
    "email_hosting_login_access",
    "old_emails_need_moving",
    "number_of_mailboxes_to_migrate",
    "number_of_devices_needing_setup",
    "current_issue",
    "preferred_migration_timing",
  ].forEach((key) => {
    if (!values[key]) values[key] = getReviewField(submission, key);
  });

  return values;
};

const normalizeStatus = (value: string | null | undefined) => (value || "").trim().toLowerCase().replace(/\s+/g, "_");

export const isOpenIntakeStatus = (status: string | null | undefined, intakeBucket?: string | null | undefined) => {
  const normalizedStatus = normalizeStatus(status);
  const normalizedBucket = normalizeStatus(intakeBucket);
  const closed = new Set(["activated", "converted", "closed", "rejected", "cancelled", "archived"]);
  const open = new Set(["new", "open", "pending", "pending_review", "needs_review", "manual_review_needed"]);
  if (closed.has(normalizedStatus)) return false;
  if (normalizedBucket === "icebox") return true;
  return open.has(normalizedStatus);
};

export const updateRawPayloadWithReview = (submission: DbIntakeSubmission, values: IntakeReviewValues) => {
  const payload = asRecord(submission.raw_payload) ? { ...submission.raw_payload } : {};
  const body = asRecord(payload.body) ? { ...(payload.body as Record<string, unknown>) } : { ...payload };
  body.review_overrides = values;
  if (!payload.body && Object.keys(payload).length > 0) return { body };
  return { ...payload, body };
};

export const getZohoCustomerValues = (values: IntakeReviewValues) => {
  const domain = values.domain_choice === "new_domain"
    ? values.desired_domain
    : values.domain_choice === "existing_domain"
      ? values.existing_domain
      : "";

  return {
    customerName: values.full_name,
    companyName: values.business_name,
    email: values.email || values.admin_contact_email,
    phone: values.whatsapp_number,
    domain,
    notes: buildZohoNotes(values),
  };
};

export const invoiceLineFor = (values: IntakeReviewValues, serviceType: string) => {
  if (serviceType === EMAIL_MIGRATION_PACKAGE.selectedPackage || serviceType === EMAIL_MIGRATION_PACKAGE.serviceType) {
    return "Email Migration & Setup - Review and manual setup service";
  }
  return `${displayLabel(values.package_label || values.selected_package)} - Monthly mailbox and domain management package`;
};
