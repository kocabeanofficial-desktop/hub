import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Copy, Download, Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { DeleteEnquiriesDialog } from "@/components/enquiries/DeleteEnquiriesDialog";
import { toast } from "@/hooks/use-toast";
import { ARCHIVE_FIELDS_UNAVAILABLE_MESSAGE, fetchActiveIntakeSubmissions } from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { DbClient, DbIntakeSubmission } from "@/types/database";
import {
  BUSINESS_EMAIL_PACKAGES,
  EMAIL_MIGRATION_PACKAGE,
  isBusinessEmailPackage,
  isEmailMigrationService,
  packageLabel,
  projectNameForService,
  resolveServiceType,
} from "@/lib/serviceTypeConfig";
import * as intakeReview from "@/lib/intakeReview";

type ReviewValues = intakeReview.IntakeReviewValues;

const DELETE_FAILED_MESSAGE = "Could not delete the enquiry. Please check that the enquiry archive fields exist and that your admin account has permission.";

const KNOWN_REVIEW_COLUMNS = new Set<keyof DbIntakeSubmission>([
  "full_name",
  "business_name",
  "email",
  "phone",
  "selected_package",
  "existing_domain",
  "final_notes",
  "additional_notes",
]);

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

const COMMON_EDIT_FIELDS = [
  ["full_name", "Full Name"],
  ["business_name", "Business Name"],
  ["email", "Email"],
  ["whatsapp_number", "WhatsApp Number"],
] as const;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const asString = (value: unknown): string =>
  typeof value === "string" ? value : typeof value === "number" || typeof value === "boolean" ? String(value) : "";

const joinArray = (value: unknown): string => (Array.isArray(value) ? value.filter(Boolean).map(String).join(", ") : "");

const getPayloadBody = (submission: DbIntakeSubmission): Record<string, unknown> => {
  const payload = asRecord(submission.raw_payload);
  return asRecord(payload?.body) || payload || {};
};

const readPath = (source: Record<string, unknown> | null, path: string): string => {
  if (!source) return "";
  let current: unknown = source;
  for (const part of path.split(".")) current = asRecord(current)?.[part];
  return asString(current) || joinArray(current);
};

const rawValue = (submission: DbIntakeSubmission, key: string): string => {
  const direct = (submission as unknown as Record<string, unknown>)[key];
  if (asString(direct)) return asString(direct);
  if (Array.isArray(direct)) return joinArray(direct);

  const body = getPayloadBody(submission);
  const rawBrief = asRecord(body.raw_payload);
  const reviewOverrides = asRecord(body.review_overrides);
  const paths = [
    key,
    `contact.${key}`,
    `domain.${key}`,
    `email_hosting.${key}`,
    `business_email.${key}`,
    `migration.${key}`,
  ];

  for (const source of [reviewOverrides, body, rawBrief]) {
    for (const path of paths) {
      const value = readPath(source, path);
      if (value) return value;
    }
  }
  return "";
};

const field = (submission: DbIntakeSubmission, key: string, ...fallbackPaths: string[]) => {
  const direct = rawValue(submission, key);
  if (direct) return direct;
  const body = getPayloadBody(submission);
  const rawBrief = asRecord(body.raw_payload);
  for (const path of fallbackPaths) {
    const value = readPath(body, path) || readPath(rawBrief, path);
    if (value) return value;
  }
  return "";
};

const selectedPackageFor = (values: ReviewValues, submission: DbIntakeSubmission) =>
  values.selected_package || field(submission, "selected_package", "selected_plan", "package_type");

const serviceTypeFor = (values: ReviewValues, submission: DbIntakeSubmission) => {
  const selectedPackage = selectedPackageFor(values, submission);
  if (isBusinessEmailPackage(selectedPackage)) return selectedPackage;
  if (isEmailMigrationService(field(submission, "service_type"), selectedPackage)) return EMAIL_MIGRATION_PACKAGE.selectedPackage;
  return field(submission, "service_type") || "general_enquiry";
};

const buildInitialReviewValues = (submission: DbIntakeSubmission): ReviewValues => {
  return intakeReview.buildInitialEmailReviewValues(submission);
};

const Row = ({ label, value }: { label: string; value: string | null | undefined }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="w-48 shrink-0 text-muted-foreground font-medium">{label}</span>
      <span className="text-foreground flex-1 whitespace-pre-wrap">{value}</span>
    </div>
  );
};

const SectionCard = ({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
      {action}
    </div>
    <div className="p-4 space-y-3">{children}</div>
  </div>
);

const CopyButton = ({ text, label = "Copy" }: { text: string; label?: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5 text-xs rounded-xl">
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : label}
    </Button>
  );
};

const EditField = ({
  label,
  name,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  multiline?: boolean;
}) => (
  <label className="grid gap-1.5 text-sm">
    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
    {multiline ? (
      <textarea
        value={value || ""}
        onChange={(event) => onChange(name, event.target.value)}
        rows={3}
        className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    ) : (
      <input
        value={value || ""}
        onChange={(event) => onChange(name, event.target.value)}
        className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    )}
  </label>
);

const SYSTEM_FIELD_OPTIONS: Record<string, { value: string; label: string }[]> = {
  domain_choice: [
    { value: "new_domain", label: "New domain" },
    { value: "existing_domain", label: "Existing domain" },
    { value: "unsure", label: "Not sure / needs review" },
  ],
  domain_check_status: [
    { value: "available", label: "Available" },
    { value: "unavailable", label: "Appears unavailable" },
    { value: "manual_review", label: "Manual review needed" },
    { value: "pending_review", label: "Pending review" },
  ],
  domain_access_status: [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
    { value: "unsure", label: "Not sure" },
    { value: "not_applicable", label: "Not applicable" },
  ],
  epp_auth_code_status: [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
    { value: "unsure", label: "Not sure" },
    { value: "not_applicable", label: "Not applicable" },
  ],
  domain_login_access: [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
    { value: "unsure", label: "Not sure" },
    { value: "not_applicable", label: "Not applicable" },
  ],
  email_hosting_login_access: [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
    { value: "unsure", label: "Not sure" },
    { value: "not_applicable", label: "Not applicable" },
  ],
  old_emails_need_moving: [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
    { value: "unsure", label: "Not sure" },
  ],
};

const SystemSelect = ({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
}) => {
  const options = SYSTEM_FIELD_OPTIONS[name] || [];
  const hasCurrentValue = value && !options.some((option) => option.value === value);
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <select
        value={value || ""}
        onChange={(event) => onChange(name, event.target.value)}
        className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <option value="">Select value</option>
        {hasCurrentValue && <option value={value}>{intakeReview.displayLabel(value)}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
};

const PackageSelect = ({ value, onChange }: { value: string; onChange: (name: string, value: string) => void }) => (
  <label className="grid gap-1.5 text-sm">
    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Selected Package</span>
    <select
      value={value || ""}
      onChange={(event) => {
        const next = event.target.value;
        onChange("selected_package", next);
        if (isBusinessEmailPackage(next)) {
          const config = BUSINESS_EMAIL_PACKAGES[next];
          onChange("package_label", config.label);
          onChange("mailbox_limit", String(config.mailboxLimit));
          onChange("package_price_monthly", String(config.monthlyPrice));
        }
      }}
      className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
    >
      <option value="">Select package</option>
      {Object.entries(BUSINESS_EMAIL_PACKAGES).map(([code, config]) => (
        <option key={code} value={code}>{config.label}</option>
      ))}
      <option value={EMAIL_MIGRATION_PACKAGE.selectedPackage}>{EMAIL_MIGRATION_PACKAGE.label}</option>
    </select>
  </label>
);

const duplicateStatus = (
  values: ReviewValues,
  submission: DbIntakeSubmission,
  clients: DbClient[],
  submissions: DbIntakeSubmission[],
) => {
  const emails = [values.email, values.admin_contact_email].filter(Boolean).map((value) => value.toLowerCase().trim());
  if (emails.length === 0) return "manual_review_needed";
  const clientMatch = clients.some((client) => client.email && emails.includes(client.email.toLowerCase().trim()));
  if (clientMatch) return "possible_existing_client";
  const pendingMatch = submissions.some((item) => {
    if (item.id === submission.id || item.status === "activated" || item.status === "rejected") return false;
    const itemEmails = [item.email, rawValue(item, "admin_contact_email")].filter(Boolean).map((value) => value.toLowerCase().trim());
    return itemEmails.some((email) => emails.includes(email));
  });
  if (pendingMatch) return "existing_pending_enquiry";
  return "no_match_found";
};

const formatStatus = (status: string) => intakeReview.displayLabel(status);

const buildZohoCustomerCopy = (values: ReviewValues) => {
  const customer = intakeReview.getZohoCustomerValues(values);
  return [
    "ZOHO CUSTOMER PREPARATION",
    "=".repeat(40),
    `Customer Name: ${customer.customerName}`,
    `Company Name: ${customer.companyName}`,
    `Email: ${customer.email}`,
    `Phone / Mobile: ${customer.phone}`,
    `Website / Domain: ${customer.domain}`,
    "Currency: ZAR",
    `Notes: ${customer.notes}`,
  ].filter((line) => !line.endsWith(": ")).join("\n");
};

const buildZohoInvoiceCopy = (values: ReviewValues, serviceType: string) => {
  return [
    "ZOHO INVOICE PREVIEW",
    "=".repeat(40),
    `Invoice Line: ${intakeReview.invoiceLineFor(values, serviceType)}`,
    `Selected Package: ${intakeReview.displayLabel(values.selected_package)}`,
    `Monthly Price: ${intakeReview.formatMonthlyPrice(values.package_price_monthly)}`,
    `Mailbox Limit: ${values.mailbox_limit}`,
    `Domain Note: ${intakeReview.buildDomainNote(values)}`,
  ].filter((lineItem) => !lineItem.endsWith(": ")).join("\n");
};

const updateRawPayloadWithReview = (submission: DbIntakeSubmission, values: ReviewValues) => {
  return intakeReview.updateRawPayloadWithReview(submission, values);
};

const downloadZohoCSV = (values: ReviewValues) => {
  const customer = intakeReview.getZohoCustomerValues(values);
  const headers = ["Customer Name", "Company Name", "Email", "Phone / Mobile", "Website / Domain", "Currency Code", "Notes"];
  const row = [
    customer.customerName,
    customer.companyName,
    customer.email,
    customer.phone,
    customer.domain,
    "ZAR",
    customer.notes,
  ];
  const escape = (value: string) => `"${(value || "").replace(/"/g, '""')}"`;
  const blob = new Blob([[headers.map(escape).join(","), row.map(escape).join(",")].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `zoho-customer-${(values.business_name || values.full_name || "client").replace(/\s+/g, "-").toLowerCase()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

interface Props {
  enquiry: DbIntakeSubmission;
  archiveSupported?: boolean;
  onBack: () => void;
  onDeleted?: () => void;
}

export function EnquiryDetailPage({ enquiry: enqProp, archiveSupported = true, onBack, onDeleted }: Props) {
  const [enq, setEnq] = useState(enqProp);
  const [values, setValues] = useState<ReviewValues>(() => buildInitialReviewValues(enqProp));
  const [savingReview, setSavingReview] = useState(false);
  const [converting, setConverting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ["clients", "duplicate_check"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*");
      if (error) throw error;
      return (data ?? []) as DbClient[];
    },
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ["intake_submissions", "duplicate_check"],
    queryFn: async () => {
      const { submissions } = await fetchActiveIntakeSubmissions();
      return submissions;
    },
  });

  const selectedPackage = selectedPackageFor(values, enq);
  const resolvedServiceType = serviceTypeFor(values, enq);
  const isBusinessEmail = isBusinessEmailPackage(selectedPackage) || resolvedServiceType === "business_email";
  const isMigration = resolvedServiceType === EMAIL_MIGRATION_PACKAGE.selectedPackage || resolvedServiceType === "email_migration";
  const isEmailService = isBusinessEmail || isMigration;
  const duplicate = useMemo(() => duplicateStatus(values, enq, clients, submissions), [clients, enq, submissions, values]);
  const zohoCustomerCopy = buildZohoCustomerCopy(values);
  const zohoInvoiceCopy = buildZohoInvoiceCopy(values, resolvedServiceType);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["intake_submissions"] });
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    queryClient.invalidateQueries({ queryKey: ["client_services"] });
  };

  const updateValue = (name: string, value: string) => setValues((previous) => ({ ...previous, [name]: value }));

  const handleSaveReview = async () => {
    setSavingReview(true);
    try {
      const updatePayload: Record<string, unknown> = {
        raw_payload: updateRawPayloadWithReview(enq, values),
      };
      Object.entries(values).forEach(([key, value]) => {
        if (KNOWN_REVIEW_COLUMNS.has(key as keyof DbIntakeSubmission)) updatePayload[key] = value || null;
      });
      if (values.whatsapp_number) updatePayload.phone = values.whatsapp_number;

      const { data, error } = await supabase
        .from("intake_submissions")
        .update(updatePayload)
        .eq("id", enq.id)
        .select("*")
        .single();
      if (error) throw error;

      setEnq(data as DbIntakeSubmission);
      invalidate();
      toast({ title: "Review details saved" });
    } catch (error) {
      toast({ title: "Failed to save review details", description: (error as Error).message, variant: "destructive" });
    } finally {
      setSavingReview(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    const { error } = await supabase.from("intake_submissions").update({ status: newStatus }).eq("id", enq.id);
    if (error) {
      toast({ title: "Status update failed", description: error.message, variant: "destructive" });
      return;
    }
    invalidate();
    setEnq({ ...enq, status: newStatus });
    toast({ title: `Status changed to ${newStatus}` });
  };

  const handleActivate = async () => {
    if (enq.client_id || enq.project_id) {
      toast({ title: "Already activated", variant: "destructive" });
      return;
    }

    setConverting(true);
    try {
      const serviceCode = resolvedServiceType;
      const { serviceType, config, usedFallback } = resolveServiceType(serviceCode);
      const businessName = values.business_name || values.full_name || "New Client";
      const activationStartedAt = new Date().toISOString();

      const { data: client, error: clientError } = await supabase
        .from("clients")
        .insert({
          business_name: businessName,
          email: values.email || values.admin_contact_email || null,
          phone: values.whatsapp_number || null,
          website_url: intakeReview.getZohoCustomerValues(values).domain || null,
          notes: values.notes || null,
          status: "active",
        })
        .select()
        .single();
      if (clientError) throw clientError;

      const { error: serviceError } = await supabase
        .from("client_services")
        .insert({
          client_id: client.id,
          service_code: serviceType,
          is_active: true,
          source: "enquiry_activation",
          status: "active",
          started_at: activationStartedAt,
          billing_cycle: isBusinessEmail ? "monthly" : "once_off",
          notes: isEmailService ? zohoInvoiceCopy : values.notes || null,
        });
      if (serviceError) throw serviceError;

      let projectId: string | null = null;
      if (config.requiresProject && config.projectType) {
        const { data: project, error: projectError } = await supabase
          .from("projects")
          .insert({
            client_id: client.id,
            project_name: projectNameForService(serviceType, businessName),
            project_type: config.projectType,
            priority: "medium",
            stage: "enquiry_received",
            description: values.notes || field(enq, "website_goals", "website_goals.goals", "website_goal"),
          })
          .select("id")
          .single();
        if (projectError) throw projectError;
        projectId = project.id;
      }

      const { error: updateError } = await supabase
        .from("intake_submissions")
        .update({
          status: "activated",
          client_id: client.id,
          project_id: projectId,
          raw_payload: updateRawPayloadWithReview(enq, values),
        })
        .eq("id", enq.id);
      if (updateError) throw updateError;

      invalidate();
      setEnq({ ...enq, status: "activated", client_id: client.id, project_id: projectId });
      toast({
        title: usedFallback ? "Client activated as General Enquiry" : "Client activated successfully",
        description: config.requiresProject ? `${config.label} project created.` : `${config.label} service created. No project created.`,
      });
    } catch (error) {
      toast({ title: "Failed to activate", description: (error as Error).message, variant: "destructive" });
    } finally {
      setConverting(false);
    }
  };

  const handleSoftDelete = async ({
    deleteLinkedClient,
    deleteLinkedProject,
  }: {
    deleteLinkedClient: boolean;
    deleteLinkedProject: boolean;
  }) => {
    if (!archiveSupported) {
      toast({
        title: "Archive unavailable",
        description: ARCHIVE_FIELDS_UNAVAILABLE_MESSAGE,
        variant: "destructive",
      });
      return;
    }
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("intake_submissions")
        .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id || null, status: "archived" })
        .eq("id", enq.id);
      if (error) throw error;

      if (deleteLinkedClient && enq.client_id) {
        const { error: clientError } = await supabase.from("clients").update({ status: "archived" }).eq("id", enq.client_id);
        if (clientError) throw clientError;
      }

      if (deleteLinkedProject && enq.project_id) {
        const { error: projectError } = await supabase.from("projects").update({ stage: "archived" }).eq("id", enq.project_id);
        if (projectError) throw projectError;
      }

      toast({ title: "Enquiry deleted" });
      invalidate();
      setDeleteDialogOpen(false);
      onDeleted?.();
      if (!onDeleted) onBack();
    } catch (error) {
      console.error("Failed to archive enquiry", error);
      toast({
        title: "Delete failed",
        description: DELETE_FAILED_MESSAGE,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const serviceFields = isMigration ? MIGRATION_FIELDS : BUSINESS_EMAIL_FIELDS;
  const activationLabel = isEmailService ? "Activate - Create Client + Service" : "Activate - Create Client + Project";
  const displayValueForKey = (key: string, value: string) =>
    ["selected_package", "package_label", "domain_choice", "domain_access_status", "epp_auth_code_status", "domain_check_status", "old_emails_need_moving", "domain_login_access", "email_hosting_login_access"].includes(key)
      ? intakeReview.displayLabel(value)
      : value;

  return (
    <div className="space-y-4 max-w-4xl">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Enquiries
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">
            {values.full_name || values.business_name || "Unknown Enquiry"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {values.email || "No email"} / {values.whatsapp_number || "No phone"} / Submitted {new Date(enq.created_at).toLocaleDateString("en-ZA")}
          </p>
        </div>
        <StatusBadge status={enq.status} />
      </div>

      <SectionCard title="Actions">
        {!archiveSupported && (
          <div className="rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {ARCHIVE_FIELDS_UNAVAILABLE_MESSAGE}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {["new", "contacted", "qualified", "activated", "icebox", "rejected"].map((status) => (
            <Button
              key={status}
              size="sm"
              variant={enq.status === status ? "default" : "outline"}
              className="capitalize rounded-xl text-xs"
              onClick={() => handleStatusChange(status)}
            >
              {status}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2 rounded-xl" onClick={handleSaveReview} disabled={savingReview}>
            {savingReview ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Review Updates
          </Button>
          <Button className="gap-2 rounded-xl" onClick={handleActivate} disabled={converting || !!enq.client_id}>
            {converting && <Loader2 className="h-4 w-4 animate-spin" />}
            {enq.client_id ? "Already Activated" : activationLabel}
          </Button>
          <Button variant="destructive" className="gap-2 rounded-xl" onClick={() => setDeleteDialogOpen(true)} disabled={deleting || !archiveSupported}>
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Duplicate Check">
        <Row label="Duplicate check status" value={formatStatus(duplicate)} />
      </SectionCard>

      <SectionCard title="Editable Review Before Activation">
        <div className="grid sm:grid-cols-2 gap-3">
          {COMMON_EDIT_FIELDS.map(([name, label]) => (
            <EditField key={name} name={name} label={label} value={values[name]} onChange={updateValue} />
          ))}
          <PackageSelect value={values.selected_package} onChange={updateValue} />
          {serviceFields.map(([name, label]) => (
            name === "selected_package" ? null : SYSTEM_FIELD_OPTIONS[name] ? (
              <SystemSelect key={name} name={name} label={label} value={values[name]} onChange={updateValue} />
            ) : (
              <EditField
                key={name}
                name={name}
                label={label}
                value={values[name]}
                onChange={updateValue}
                multiline={["required_email_addresses", "current_email_addresses", "current_issue", "domain_check_message", "notes"].includes(name)}
              />
            )
          ))}
        </div>
      </SectionCard>

      <SectionCard title={isMigration ? "Email Migration Details" : "Business Email Details"}>
        {serviceFields.map(([name, label]) => (
          name === "main_admin_mailbox" && !values[name] ? null : <Row key={name} label={label} value={displayValueForKey(name, values[name])} />
        ))}
        {field(enq, "turnstile_token") && <Row label="Turnstile Token" value="Present" />}
      </SectionCard>

      {isEmailService ? (
        <>
          <SectionCard title="Website Work">
            <p className="text-sm text-muted-foreground">
              {isMigration ? "Not applicable for Email Migration service." : "Not applicable for Business Email service."}
            </p>
          </SectionCard>
          <SectionCard title="SEO">
            <p className="text-sm text-muted-foreground">
              {isMigration ? "Not applicable for Email Migration service." : "Not applicable for Business Email service."}
            </p>
          </SectionCard>
        </>
      ) : (
        <SectionCard title="Website Brief">
          <Row label="Website Goals" value={field(enq, "website_goals", "website_goals.goals", "website_goal")} />
          <Row label="Pages Needed" value={field(enq, "pages_needed", "pages_needed.pages", "selected_pages")} />
          <Row label="Main Services/Products" value={field(enq, "main_services_products", "website_goals.main_services_products")} />
          <Row label="Design Style" value={field(enq, "design_style", "design_preferences.design_style")} />
          <Row label="Features Needed" value={field(enq, "features_needed", "design_preferences.features_needed")} />
        </SectionCard>
      )}

      {isEmailService && (
        <>
          <SectionCard title="Zoho Customer Preparation" action={<CopyButton text={zohoCustomerCopy} label="Copy Customer" />}>
            <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/40 rounded-xl p-3">{zohoCustomerCopy}</pre>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs rounded-xl" onClick={() => downloadZohoCSV(values)}>
              <Download className="h-3 w-3" /> Download Customer CSV
            </Button>
          </SectionCard>

          <SectionCard title="Zoho Invoice Preview" action={<CopyButton text={zohoInvoiceCopy} label="Copy Invoice" />}>
            <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/40 rounded-xl p-3">{zohoInvoiceCopy}</pre>
          </SectionCard>
        </>
      )}

      <SectionCard title="Raw / Legacy Data">
        <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Detected Contact Fields</p>
          {intakeReview.getDetectedContactSummary(enq).map((item) => (
            <div key={item.label} className="grid sm:grid-cols-[180px_1fr] gap-1 text-xs">
              <span className="font-medium text-muted-foreground">{item.label}</span>
              <span className="text-foreground">
                {item.value || "Not found"}
                {item.path ? <span className="text-muted-foreground"> ({item.path})</span> : null}
              </span>
            </div>
          ))}
        </div>
        <details>
          <summary className="text-xs text-muted-foreground cursor-pointer">Show raw payload, including legacy mailbox fields</summary>
          <pre className="text-xs font-mono mt-2 bg-muted/40 rounded-xl p-3 max-h-80 overflow-y-auto whitespace-pre-wrap">
            {JSON.stringify(enq.raw_payload, null, 2) || "null"}
          </pre>
        </details>
      </SectionCard>

      <DeleteEnquiriesDialog
        open={deleteDialogOpen}
        enquiries={[enq]}
        deleting={deleting}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleSoftDelete}
      />
    </div>
  );
}
