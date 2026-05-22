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

const directIntakeValue = (submission: DbIntakeSubmission, key: string) => {
  const direct = (submission as unknown as Record<string, unknown>)[key];
  return asString(direct) || joinArray(direct);
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
  reviewValue(submission, [
    "review_overrides.full_name",
    "raw_payload.body.review_overrides.full_name",
    "intake.full_name",
    "intake.contact_name",
    "intake.name",
    "raw_payload.full_name",
    "raw_payload.name",
    "raw_payload.contact_name",
    "raw_payload.body.full_name",
    "raw_payload.body.name",
    "raw_payload.body.contact_name",
    "raw_payload.formData.full_name",
    "raw_payload.formData.name",
    "raw_payload.payload.full_name",
    "raw_payload.payload.name",
  ]);

export const getContactEmail = (submission: DbIntakeSubmission) =>
  reviewValue(submission, [
    "review_overrides.email",
    "raw_payload.body.review_overrides.email",
    "intake.email",
    "intake.contact_email",
    "raw_payload.email",
    "raw_payload.contact_email",
    "raw_payload.body.email",
    "raw_payload.body.contact_email",
    "raw_payload.formData.email",
    "raw_payload.formData.contact_email",
    "raw_payload.payload.email",
    "raw_payload.payload.contact_email",
    "raw_payload.admin_contact_email",
  ]);

export const getContactPhone = (submission: DbIntakeSubmission) =>
  reviewValue(submission, [
    "review_overrides.whatsapp_number",
    "raw_payload.body.review_overrides.whatsapp_number",
    "intake.phone",
    "intake.whatsapp_number",
    "intake.whatsapp",
    "raw_payload.whatsapp_number",
    "raw_payload.phone",
    "raw_payload.whatsapp",
    "raw_payload.body.whatsapp_number",
    "raw_payload.body.phone",
    "raw_payload.body.whatsapp",
    "raw_payload.formData.whatsapp_number",
    "raw_payload.formData.phone",
    "raw_payload.formData.whatsapp",
    "raw_payload.payload.whatsapp_number",
    "raw_payload.payload.phone",
    "raw_payload.payload.whatsapp",
  ]);

export const getBusinessName = (submission: DbIntakeSubmission) =>
  reviewValue(submission, [
    "review_overrides.business_name",
    "raw_payload.body.review_overrides.business_name",
    "intake.business_name",
    "raw_payload.business_name",
    "raw_payload.body.business_name",
    "raw_payload.formData.business_name",
    "raw_payload.payload.business_name",
  ]);

export const getAdminContactEmail = (submission: DbIntakeSubmission) =>
  reviewValue(submission, [
    "review_overrides.admin_contact_email",
    "raw_payload.body.review_overrides.admin_contact_email",
    "raw_payload.admin_contact_email",
    "raw_payload.body.admin_contact_email",
    "raw_payload.formData.admin_contact_email",
    "raw_payload.payload.admin_contact_email",
    "raw_payload.main_admin_mailbox",
    "raw_payload.body.main_admin_mailbox",
    "intake.email",
  ]);

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
    email: values.admin_contact_email || values.email,
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
