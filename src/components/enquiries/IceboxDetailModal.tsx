import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronDown, Loader2, MessageCircle } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import type { DbIntakeSubmission } from "@/types/database";
import { BUSINESS_EMAIL_PACKAGES, isBusinessEmailPackage, isEmailMigrationService } from "@/lib/serviceTypeConfig";
import * as intakeReview from "@/lib/intakeReview";

interface Props {
  submission: DbIntakeSubmission | null;
  onClose: () => void;
  onActivate: (s: DbIntakeSubmission) => void;
  onReject: (s: DbIntakeSubmission) => void;
  onWhatsApp: (s: DbIntakeSubmission) => void;
  activating: boolean;
  rejecting: boolean;
}

const SOURCE_COLORS: Record<string, string> = {
  managed_hosting: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  business_email: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  contractor_special: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  hire_out: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  website: "bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-300",
};

const BUSINESS_EMAIL_FIELDS = [
  ["selected_package", "Selected Package"],
  ["package_label", "Package Label"],
  ["mailbox_limit", "Mailbox Limit"],
  ["package_price_monthly", "Monthly Price"],
  ["domain_choice", "Domain Choice"],
  ["desired_domain", "Desired Domain"],
  ["existing_domain", "Existing Domain"],
  ["domain_extension", "Domain Extension"],
  ["domain_access_status", "Domain Access Status"],
  ["epp_auth_code_status", "EPP/Auth Code Status"],
  ["domain_check_status", "Domain Check Status"],
  ["domain_check_message", "Domain Check Message"],
  ["required_email_addresses", "Required Email Addresses"],
  ["admin_contact_email", "Admin Contact Email"],
  ["main_admin_mailbox", "Main Admin Mailbox"],
  ["notes", "Notes"],
] as const;

const MIGRATION_FIELDS = [
  ["existing_domain", "Existing Domain"],
  ["current_email_addresses", "Current Email Addresses"],
  ["current_email_provider", "Current Email Provider"],
  ["domain_login_access", "Domain Login Access"],
  ["email_hosting_login_access", "Email Hosting Login Access"],
  ["old_emails_need_moving", "Old Emails Need Moving"],
  ["number_of_mailboxes_to_migrate", "Mailboxes To Migrate"],
  ["number_of_devices_needing_setup", "Devices Needing Setup"],
  ["current_issue", "Current Issue"],
  ["preferred_migration_timing", "Preferred Migration Timing"],
  ["admin_contact_email", "Admin Contact Email"],
  ["email", "Email"],
  ["whatsapp_number", "WhatsApp Number"],
] as const;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const asString = (value: unknown): string =>
  typeof value === "string" ? value : typeof value === "number" || typeof value === "boolean" ? String(value) : "";

const joinArray = (value: unknown) => Array.isArray(value) ? value.filter(Boolean).map(String).join(", ") : "";

const getBody = (submission: DbIntakeSubmission) => {
  const payload = asRecord(submission.raw_payload);
  return asRecord(payload?.body) || payload || {};
};

const readPath = (source: Record<string, unknown> | null, path: string) => {
  if (!source) return "";
  let current: unknown = source;
  for (const part of path.split(".")) current = asRecord(current)?.[part];
  return asString(current) || joinArray(current);
};

const field = (submission: DbIntakeSubmission, key: string, ...paths: string[]) => {
  const direct = (submission as unknown as Record<string, unknown>)[key];
  if (asString(direct)) return asString(direct);
  if (Array.isArray(direct)) return joinArray(direct);
  const body = getBody(submission);
  const rawBrief = asRecord(body.raw_payload);
  const reviewOverrides = asRecord(body.review_overrides);
  for (const source of [reviewOverrides, body, rawBrief]) {
    for (const path of [key, ...paths]) {
      const value = readPath(source, path);
      if (value) return value;
    }
  }
  return "";
};

const Row = ({ label, value }: { label: string; value: string | null | undefined }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground font-medium w-40 shrink-0 text-xs uppercase tracking-wider">{label}</span>
      <span className="text-foreground text-sm whitespace-pre-wrap">{value}</span>
    </div>
  );
};

export function IceboxDetailModal({ submission, onClose, onActivate, onReject, onWhatsApp, activating, rejecting }: Props) {
  const [jsonOpen, setJsonOpen] = useState(false);
  const s = submission;
  const payload = asRecord(s?.raw_payload);
  const payloadBody = asRecord(payload?.body);
  const selectedPackage = s ? intakeReview.getReviewField(s, "selected_package", "raw_payload.selected_plan", "raw_payload.body.selected_plan", "raw_payload.package_type", "raw_payload.body.package_type") : "";
  const sourceForm = asString(payloadBody?.source_form);
  const rawDetails = payload && Object.keys(payload).length > 0 ? payload : null;
  const isBusinessEmail = !!s && (isBusinessEmailPackage(selectedPackage) || field(s, "service_type") === "business_email");
  const isMigration = !!s && isEmailMigrationService(field(s, "service_type"), selectedPackage);
  const packageConfig = isBusinessEmailPackage(selectedPackage) ? BUSINESS_EMAIL_PACKAGES[selectedPackage] : null;
  const serviceFields = isMigration ? MIGRATION_FIELDS : BUSINESS_EMAIL_FIELDS;

  return (
    <Dialog open={!!s} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Submission Details</DialogTitle>
          <DialogDescription>Review this icebox submission.</DialogDescription>
        </DialogHeader>
        {s && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</p>
            <Row label="Name" value={intakeReview.getContactFullName(s)} />
            <Row label="Email" value={intakeReview.getContactEmail(s)} />
            <Row label="Phone" value={s.phone} />
            <Row label="WhatsApp" value={intakeReview.getContactPhone(s) || s.phone} />
            <Row label="Business" value={intakeReview.getBusinessName(s)} />

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Source & Campaign</p>
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground font-medium w-40 shrink-0 text-xs uppercase tracking-wider">Source</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SOURCE_COLORS[s.source] || "bg-muted text-muted-foreground"}`}>
                {s.source?.replace(/_/g, " ") || "unknown"}
              </span>
            </div>
            <Row label="Campaign" value={s.campaign} />
            <Row label="Source Form" value={sourceForm} />
            <Row label="Selected Plan" value={intakeReview.displayLabel(selectedPackage)} />

            {(isBusinessEmail || isMigration) && (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">
                  {isMigration ? "Email Migration Details" : "Business Email Details"}
                </p>
                {serviceFields.map(([key, label]) => {
                  const value =
                    key === "package_label" && packageConfig ? packageConfig.label :
                    key === "mailbox_limit" && packageConfig ? String(packageConfig.mailboxLimit) :
                    key === "package_price_monthly" && packageConfig ? intakeReview.formatMonthlyPrice(packageConfig.monthlyPrice) :
                    key === "admin_contact_email" ? intakeReview.getAdminContactEmail(s) :
                    field(s, key);
                  if (key === "main_admin_mailbox" && !value) return null;
                  const displayValue = key === "package_price_monthly"
                    ? intakeReview.formatMonthlyPrice(value)
                    : ["selected_package", "package_label", "domain_choice", "domain_access_status", "epp_auth_code_status", "domain_check_status", "old_emails_need_moving", "domain_login_access", "email_hosting_login_access"].includes(key)
                      ? intakeReview.displayLabel(value)
                      : value;
                  return <Row key={key} label={label} value={displayValue} />;
                })}
                {field(s, "turnstile_token") && <Row label="Turnstile Token" value="Present" />}
                <p className="text-sm text-muted-foreground pt-1">
                  {isMigration ? "Not applicable for Email Migration service." : "Not applicable for Business Email service."}
                </p>
              </>
            )}

            {!isBusinessEmail && !isMigration && (s.trade || s.domain_of_interest || s.current_website || s.contract_term || s.needs_logo !== null || s.project_type || s.preferred_date || s.preferred_time || s.estimated_timeline || s.service_type) && (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Campaign Details</p>
                <Row label="Trade" value={s.trade} />
                <Row label="Domain Interest" value={s.domain_of_interest} />
                <Row label="Current Website" value={s.current_website} />
                <Row label="Contract Term" value={s.contract_term} />
                {s.needs_logo !== null && <Row label="Needs Logo" value={s.needs_logo ? "Yes" : "No"} />}
                <Row label="Project Type" value={s.project_type} />
                <Row label="Service Type" value={s.service_type} />
                <Row label="Preferred Date" value={s.preferred_date} />
                <Row label="Preferred Time" value={s.preferred_time} />
                <Row label="Timeline" value={s.estimated_timeline} />
              </>
            )}

            <Row label="Services" value={s.requested_services} />
            <Row label="Additional Notes" value={s.additional_notes} />
            <Row label="Notes" value={s.processing_notes} />
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium w-40 shrink-0 text-xs uppercase tracking-wider">Status</span>
              <StatusBadge status={s.status} />
            </div>

            {rawDetails && Object.keys(rawDetails).length > 0 && (
              <Collapsible open={jsonOpen} onOpenChange={setJsonOpen}>
                <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition pt-2">
                  <ChevronDown className={`h-3 w-3 transition-transform ${jsonOpen ? "rotate-180" : ""}`} />
                  Raw submission data
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <pre className="mt-2 bg-muted/50 rounded-lg p-3 text-xs overflow-auto max-h-48 text-foreground">
                    {JSON.stringify(rawDetails, null, 2)}
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}
        {s && s.status === "icebox" && (
          <DialogFooter className="gap-2 pt-2 flex-wrap">
            <Button variant="outline" size="sm" disabled={rejecting || activating} onClick={() => onReject(s)}>
              {rejecting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Reject
            </Button>
            {s.phone && (
              <Button variant="outline" size="sm" onClick={() => onWhatsApp(s)}>
                <MessageCircle className="h-4 w-4 mr-1" />
                WhatsApp
              </Button>
            )}
            <Button size="sm" disabled={activating || rejecting} onClick={() => onActivate(s)}>
              {activating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Activate Client
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
