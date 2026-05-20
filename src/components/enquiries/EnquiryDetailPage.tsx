import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Copy, Check, Download, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import type { DbIntakeSubmission } from "@/types/database";

// ─── Helpers ────────────────────────────────────────────────────────────────

const asRecord = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

const asString = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v : null;

const joinArr = (v: unknown): string =>
  Array.isArray(v) ? (v as unknown[]).filter(Boolean).map(String).join(", ") : "";

/** Extract the payload body from raw_payload (handles nested body wrapper) */
const getPayloadBody = (s: DbIntakeSubmission): Record<string, unknown> => {
  const payload = asRecord(s.raw_payload);
  return asRecord(payload?.body) || payload || {};
};

/** Read a field from dedicated column first, fallback to raw_payload */
const field = (s: DbIntakeSubmission, col: keyof DbIntakeSubmission, ...payloadPaths: string[]): string => {
  const direct = s[col];
  if (typeof direct === "string" && direct.trim()) return direct;
  if (typeof direct === "boolean") return direct ? "Yes" : "No";
  if (typeof direct === "number") return String(direct);
  const body = getPayloadBody(s);
  const rawBrief = asRecord(body?.raw_payload);
  for (const path of payloadPaths) {
    const parts = path.split(".");
    let cur: unknown = body;
    for (const p of parts) cur = asRecord(cur)?.[p];
    const v = asString(cur) || joinArr(cur);
    if (v) return v;
    // Also try rawBrief
    let cur2: unknown = rawBrief;
    for (const p of parts) cur2 = asRecord(cur2)?.[p];
    const v2 = asString(cur2) || joinArr(cur2);
    if (v2) return v2;
  }
  return "";
};

// ─── Copy Button ─────────────────────────────────────────────────────────────

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
      {copied ? "Copied!" : label}
    </Button>
  );
};

// ─── Section Card ─────────────────────────────────────────────────────────────

const SectionCard = ({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
      {action}
    </div>
    <div className="p-4 space-y-2">{children}</div>
  </div>
);

const Row = ({ label, value }: { label: string; value: string | null | undefined }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="w-44 shrink-0 text-muted-foreground font-medium">{label}</span>
      <span className="text-foreground flex-1 whitespace-pre-wrap">{value}</span>
    </div>
  );
};

// ─── Brief Builder ────────────────────────────────────────────────────────────

const buildWebsiteBrief = (s: DbIntakeSubmission): string => {
  const lines: string[] = [
    "SMART WEBSITE SETUP BRIEF",
    "=".repeat(40),
    "",
    "CLIENT INFORMATION",
    `Name: ${field(s, "full_name", "name", "full_name")}`,
    `Business: ${field(s, "business_name", "business_name")}`,
    `Email: ${field(s, "email", "email")}`,
    `Phone: ${field(s, "phone", "phone")}`,
    `Preferred Contact: ${field(s, "preferred_contact", "preferred_contact", "contact.preferred_contact")}`,
    `Business Registration: ${field(s, "business_registration", "business_registration")}`,
    "",
    "PACKAGE",
    `Selected Package: ${field(s, "selected_package", "selected_plan", "package_type")}`,
    `Setup Fee: ${field(s, "setup_fee", "setup_fee")}`,
    `Monthly Fee: ${field(s, "monthly_fee", "monthly_fee")}`,
    "",
    "DOMAIN",
    `Domain Status: ${field(s, "domain_status", "domain.domain_status", "domain_status")}`,
    `Existing Domain: ${field(s, "existing_domain", "domain.existing_domain", "existing_domain") || field(s, "domain_name", "domain_name")}`,
    `Domain Provider: ${field(s, "domain_provider", "domain.domain_provider")}`,
    `Domain Access: ${field(s, "domain_access", "domain.domain_access")}`,
    `Preferred Domains: ${field(s, "preferred_domains", "domain.preferred_domains")}`,
    "",
    "BUSINESS OVERVIEW",
    `Industry: ${field(s, "industry", "business_overview.industry", "industry")}`,
    `Operating Area: ${field(s, "operating_area", "business_overview.operating_area")}`,
    `Business Overview: ${field(s, "business_overview", "business_overview.business_description", "business_description")}`,
    `Ideal Customers: ${field(s, "ideal_customers", "business_overview.ideal_customers")}`,
    `Customer Problem Solved: ${field(s, "customer_problem_solved", "business_overview.customer_problem_solved")}`,
    `Trust Factors: ${field(s, "trust_factors", "business_overview.trust_factors")}`,
    "",
    "WEBSITE GOALS",
    `Website Goals: ${field(s, "website_goals", "website_goals.goals", "website_goal")}`,
    `Main Visitor Action: ${field(s, "main_visitor_action", "website_goals.main_visitor_action")}`,
    `Pages Needed: ${field(s, "pages_needed", "pages_needed.pages", "selected_pages")}`,
    `Main Services/Products: ${field(s, "main_services_products", "website_goals.main_services_products")}`,
    "",
    "CONTENT & ASSETS",
    `Content Status: ${field(s, "content_status", "content_assets.content_status")}`,
    `Logo Status: ${field(s, "logo_status", "content_assets.logo_status")} ${s.has_logo ? "(Has logo)" : ""}`,
    `Brand Colours: ${field(s, "brand_colours_status", "content_assets.brand_colours_status")}`,
    `Photos/Images: ${field(s, "photos_status", "content_assets.photos_status")} ${s.has_images ? "(Has images)" : ""}`,
    `Upload Note: ${field(s, "upload_note", "content_assets.upload_note")}`,
    "",
    "DESIGN PREFERENCES",
    `Design Style: ${field(s, "design_style", "design_preferences.design_style")}`,
    `Websites Liked: ${field(s, "website_examples_liked", "design_preferences.website_examples_liked")}`,
    `Websites Disliked: ${field(s, "websites_disliked", "design_preferences.websites_disliked")}`,
    `Competitors: ${field(s, "competitors", "design_preferences.competitors")}`,
    `Features Needed: ${field(s, "features_needed", "design_preferences.features_needed")}`,
    "",
    "EMAIL / HOSTING",
    `Mailbox Count: ${field(s, "mailbox_count", "email_hosting.mailbox_count")} ${s.needs_email ? "(Email needed)" : ""}`,
    `Requested Email Addresses: ${field(s, "requested_email_addresses", "email_hosting.requested_email_addresses")}`,
    "",
    "TIMELINE",
    `Start Timing: ${field(s, "start_timing", "timeline.start_timing")}`,
    `Launch Deadline: ${field(s, "launch_deadline", "timeline.launch_deadline")}`,
    "",
    "ADDITIONAL NOTES",
    field(s, "final_notes", "final_notes") || field(s, "additional_notes") || "",
  ];
  return lines.filter(l => !l.endsWith(": ")).join("\n");
};

const buildInvoiceCopy = (s: DbIntakeSubmission): string => {
  const lines = [
    "INVOICE COPY — ZOHO INVOICE CREATION",
    "=".repeat(40),
    `Customer/Business Name: ${field(s, "business_name")}`,
    `Contact Person: ${field(s, "full_name")}`,
    `Email: ${field(s, "email")}`,
    `Phone: ${field(s, "phone")}`,
    `Package: ${field(s, "selected_package", "selected_plan", "package_type")}`,
    `Setup Fee: ${field(s, "setup_fee")}`,
    `Monthly Fee: ${field(s, "monthly_fee")}`,
    `Domain Request: ${field(s, "existing_domain", "domain_name") || field(s, "preferred_domains") || field(s, "domain_status")}`,
    `Mailbox Count: ${field(s, "mailbox_count")}`,
    `Requested Email Addresses: ${field(s, "requested_email_addresses")}`,
  ];
  return lines.filter(l => !l.endsWith(": ")).join("\n");
};

const buildZohoCustomerCopy = (s: DbIntakeSubmission): string => {
  const lines = [
    "ZOHO CUSTOMER RECORD",
    "=".repeat(40),
    `Company Name: ${field(s, "business_name")}`,
    `Display Name: ${field(s, "business_name") || field(s, "full_name")}`,
    `First Name: ${field(s, "full_name").split(" ")[0] || ""}`,
    `Last Name: ${field(s, "full_name").split(" ").slice(1).join(" ") || ""}`,
    `Email: ${field(s, "email")}`,
    `Phone: ${field(s, "phone")}`,
    `Currency: ZAR`,
    `Customer Type: Business`,
    `Notes: ${[field(s, "industry"), field(s, "operating_area")].filter(Boolean).join(" | ")}`,
  ];
  return lines.filter(l => !l.endsWith(": ")).join("\n");
};

const downloadZohoCSV = (s: DbIntakeSubmission) => {
  const fullName = field(s, "full_name");
  const parts = fullName.split(" ");
  const firstName = parts[0] || "";
  const lastName = parts.slice(1).join(" ") || "";
  const businessName = field(s, "business_name");
  const email = field(s, "email");
  const phone = field(s, "phone");
  const industry = field(s, "industry");
  const area = field(s, "operating_area");

  const headers = [
    "Customer Name", "First Name", "Last Name", "Company Name",
    "Email", "Phone", "Mobile", "Currency Code",
    "Customer Type", "Notes",
  ];
  const row = [
    businessName || fullName, firstName, lastName, businessName,
    email, phone, phone, "ZAR",
    "Business", [industry, area].filter(Boolean).join(" | "),
  ];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(","), row.map(escape).join(",")].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `zoho-customer-${(businessName || fullName || "client").replace(/\s+/g, "-").toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ─── Field Mapping Check ──────────────────────────────────────────────────────

const REQUIRED_FIELDS: { label: string; col: keyof DbIntakeSubmission; payloadPaths: string[] }[] = [
  { label: "Name", col: "full_name", payloadPaths: ["name", "full_name"] },
  { label: "Email", col: "email", payloadPaths: ["email"] },
  { label: "Phone", col: "phone", payloadPaths: ["phone"] },
  { label: "Business Name", col: "business_name", payloadPaths: ["business_name"] },
  { label: "Selected Package", col: "selected_package", payloadPaths: ["selected_plan", "package_type"] },
  { label: "Setup Fee", col: "setup_fee", payloadPaths: ["setup_fee"] },
  { label: "Monthly Fee", col: "monthly_fee", payloadPaths: ["monthly_fee"] },
  { label: "Preferred Contact", col: "preferred_contact", payloadPaths: ["preferred_contact"] },
  { label: "Business Registration", col: "business_registration", payloadPaths: ["business_registration"] },
  { label: "Domain Status", col: "domain_status", payloadPaths: ["domain.domain_status"] },
  { label: "Existing Domain", col: "existing_domain", payloadPaths: ["domain.existing_domain", "domain_name"] },
  { label: "Domain Provider", col: "domain_provider", payloadPaths: ["domain.domain_provider"] },
  { label: "Domain Access", col: "domain_access", payloadPaths: ["domain.domain_access"] },
  { label: "Preferred Domains", col: "preferred_domains", payloadPaths: ["domain.preferred_domains"] },
  { label: "Industry", col: "industry", payloadPaths: ["business_overview.industry"] },
  { label: "Operating Area", col: "operating_area", payloadPaths: ["business_overview.operating_area"] },
  { label: "Business Overview", col: "business_overview", payloadPaths: ["business_overview.business_description", "business_description"] },
  { label: "Ideal Customers", col: "ideal_customers", payloadPaths: ["business_overview.ideal_customers"] },
  { label: "Customer Problem Solved", col: "customer_problem_solved", payloadPaths: ["business_overview.customer_problem_solved"] },
  { label: "Trust Factors", col: "trust_factors", payloadPaths: ["business_overview.trust_factors"] },
  { label: "Website Goals", col: "website_goals", payloadPaths: ["website_goals.goals", "website_goal"] },
  { label: "Main Visitor Action", col: "main_visitor_action", payloadPaths: ["website_goals.main_visitor_action"] },
  { label: "Pages Needed", col: "pages_needed", payloadPaths: ["pages_needed.pages", "selected_pages"] },
  { label: "Main Services/Products", col: "main_services_products", payloadPaths: ["website_goals.main_services_products"] },
  { label: "Content Status", col: "content_status", payloadPaths: ["content_assets.content_status"] },
  { label: "Logo Status", col: "logo_status", payloadPaths: ["content_assets.logo_status"] },
  { label: "Brand Colours", col: "brand_colours_status", payloadPaths: ["content_assets.brand_colours_status"] },
  { label: "Photos/Images", col: "photos_status", payloadPaths: ["content_assets.photos_status"] },
  { label: "Upload Note", col: "upload_note", payloadPaths: ["content_assets.upload_note"] },
  { label: "Design Style", col: "design_style", payloadPaths: ["design_preferences.design_style"] },
  { label: "Examples Liked", col: "website_examples_liked", payloadPaths: ["design_preferences.website_examples_liked"] },
  { label: "Websites Disliked", col: "websites_disliked", payloadPaths: ["design_preferences.websites_disliked"] },
  { label: "Competitors", col: "competitors", payloadPaths: ["design_preferences.competitors"] },
  { label: "Features Needed", col: "features_needed", payloadPaths: ["design_preferences.features_needed"] },
  { label: "Mailbox Count", col: "mailbox_count", payloadPaths: ["email_hosting.mailbox_count"] },
  { label: "Email Addresses", col: "requested_email_addresses", payloadPaths: ["email_hosting.requested_email_addresses"] },
  { label: "Start Timing", col: "start_timing", payloadPaths: ["timeline.start_timing"] },
  { label: "Launch Deadline", col: "launch_deadline", payloadPaths: ["timeline.launch_deadline"] },
  { label: "Final Notes", col: "final_notes", payloadPaths: ["final_notes", "additional_notes"] },
];

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  enquiry: DbIntakeSubmission;
  onBack: () => void;
}

export function EnquiryDetailPage({ enquiry: enqProp, onBack }: Props) {
  const [enq, setEnq] = useState(enqProp);
  const [converting, setConverting] = useState(false);
  const [showFieldCheck, setShowFieldCheck] = useState(false);
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["intake_submissions"] });
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
  };

  const handleStatusChange = async (newStatus: string) => {
    await supabase.from("intake_submissions").update({ status: newStatus }).eq("id", enq.id);
    invalidate();
    setEnq({ ...enq, status: newStatus });
    toast({ title: `Status → ${newStatus}` });
  };

  const handleActivate = async () => {
    if (enq.client_id || enq.project_id) {
      toast({ title: "Already activated", variant: "destructive" });
      return;
    }
    setConverting(true);
    try {
      const { data: client, error: ce } = await supabase
        .from("clients")
        .insert({
          business_name: field(enq, "business_name") || field(enq, "full_name") || "New Client",
          email: field(enq, "email"),
          phone: field(enq, "phone"),
          industry: field(enq, "industry", "business_overview.industry"),
          website_url: field(enq, "existing_domain", "domain_name"),
          notes: field(enq, "business_overview", "business_overview.business_description"),
          status: "active",
        })
        .select()
        .single();
      if (ce) throw ce;

      const { data: project, error: pe } = await supabase
        .from("projects")
        .insert({
          client_id: client.id,
          project_name: `Website – ${field(enq, "business_name") || field(enq, "full_name") || "New"}`,
          project_type: "website_build",
          priority: "medium",
          stage: "enquiry_received",
          description: field(enq, "website_goals", "website_goals.goals", "website_goal"),
        })
        .select()
        .single();
      if (pe) throw pe;

      await supabase
        .from("intake_submissions")
        .update({ status: "activated", client_id: client.id, project_id: project.id })
        .eq("id", enq.id);

      invalidate();
      setEnq({ ...enq, status: "activated", client_id: client.id, project_id: project.id });
      toast({ title: "Client & project created successfully" });
    } catch (err: unknown) {
      toast({ title: (err as Error).message || "Failed to activate", variant: "destructive" });
    } finally {
      setConverting(false);
    }
  };

  const brief = buildWebsiteBrief(enq);
  const invoiceCopy = buildInvoiceCopy(enq);
  const zohoCopy = buildZohoCustomerCopy(enq);

  // Field mapping check
  const fieldCheckResults = REQUIRED_FIELDS.map((f) => {
    const colVal = enq[f.col];
    const hasDirectValue = (typeof colVal === "string" && colVal.trim()) ||
                           typeof colVal === "boolean" ||
                           typeof colVal === "number";
    const payloadVal = field(enq, f.col, ...f.payloadPaths);
    const missing = !hasDirectValue && !payloadVal;
    return { ...f, colVal: hasDirectValue ? String(colVal) : null, payloadVal, missing };
  });
  const missingCount = fieldCheckResults.filter(r => r.missing).length;
  const mismatchCount = fieldCheckResults.filter(r => r.colVal && r.payloadVal && r.colVal !== r.payloadVal).length;

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Header */}
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Enquiries
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">
            {field(enq, "full_name") || field(enq, "business_name") || "Unknown Enquiry"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {field(enq, "email")} · {field(enq, "phone")} · Submitted {new Date(enq.created_at).toLocaleDateString("en-ZA")}
          </p>
        </div>
        <StatusBadge status={enq.status} />
      </div>

      {/* ── Status + Actions ── */}
      <SectionCard title="Actions">
        <div className="flex flex-wrap gap-2 mb-3">
          {["new", "contacted", "qualified", "activated", "icebox", "rejected"].map((s) => (
            <Button
              key={s}
              size="sm"
              variant={enq.status === s ? "default" : "outline"}
              className="capitalize rounded-xl text-xs"
              onClick={() => handleStatusChange(s)}
            >
              {s}
            </Button>
          ))}
        </div>
        <Button
          className="gap-2 rounded-xl"
          onClick={handleActivate}
          disabled={converting || !!enq.client_id}
        >
          {enq.client_id ? "Already Activated" : "Activate → Create Client + Project"}
        </Button>
      </SectionCard>

      {/* ── All Intake Fields ── */}
      <SectionCard title="Contact & Package">
        <Row label="Name" value={field(enq, "full_name")} />
        <Row label="Business Name" value={field(enq, "business_name")} />
        <Row label="Email" value={field(enq, "email")} />
        <Row label="Phone" value={field(enq, "phone")} />
        <Row label="Preferred Contact" value={field(enq, "preferred_contact", "preferred_contact")} />
        <Row label="Business Reg No." value={field(enq, "business_registration", "business_registration")} />
        <Row label="Selected Package" value={field(enq, "selected_package", "selected_plan", "package_type")} />
        <Row label="Setup Fee" value={field(enq, "setup_fee", "setup_fee")} />
        <Row label="Monthly Fee" value={field(enq, "monthly_fee", "monthly_fee")} />
      </SectionCard>

      <SectionCard title="Domain">
        <Row label="Domain Status" value={field(enq, "domain_status", "domain.domain_status")} />
        <Row label="Existing Domain" value={field(enq, "existing_domain", "domain.existing_domain") || field(enq, "domain_name")} />
        <Row label="Domain Provider" value={field(enq, "domain_provider", "domain.domain_provider")} />
        <Row label="Domain Access" value={field(enq, "domain_access", "domain.domain_access")} />
        <Row label="Preferred Domains" value={field(enq, "preferred_domains", "domain.preferred_domains")} />
      </SectionCard>

      <SectionCard title="Business Overview">
        <Row label="Industry" value={field(enq, "industry", "business_overview.industry")} />
        <Row label="Operating Area" value={field(enq, "operating_area", "business_overview.operating_area")} />
        <Row label="Business Overview" value={field(enq, "business_overview", "business_overview.business_description", "business_description")} />
        <Row label="Ideal Customers" value={field(enq, "ideal_customers", "business_overview.ideal_customers")} />
        <Row label="Customer Problem Solved" value={field(enq, "customer_problem_solved", "business_overview.customer_problem_solved")} />
        <Row label="Trust Factors" value={field(enq, "trust_factors", "business_overview.trust_factors")} />
      </SectionCard>

      <SectionCard title="Website Goals">
        <Row label="Website Goals" value={field(enq, "website_goals", "website_goals.goals", "website_goal")} />
        <Row label="Main Visitor Action" value={field(enq, "main_visitor_action", "website_goals.main_visitor_action")} />
        <Row label="Pages Needed" value={field(enq, "pages_needed", "pages_needed.pages", "selected_pages")} />
        <Row label="Main Services/Products" value={field(enq, "main_services_products", "website_goals.main_services_products")} />
      </SectionCard>

      <SectionCard title="Content & Assets">
        <Row label="Content Status" value={field(enq, "content_status", "content_assets.content_status")} />
        <Row label="Logo Status" value={field(enq, "logo_status", "content_assets.logo_status")} />
        <Row label="Brand Colours" value={field(enq, "brand_colours_status", "content_assets.brand_colours_status")} />
        <Row label="Photos/Images" value={field(enq, "photos_status", "content_assets.photos_status")} />
        <Row label="Upload Note" value={field(enq, "upload_note", "content_assets.upload_note")} />
      </SectionCard>

      <SectionCard title="Design Preferences">
        <Row label="Design Style" value={field(enq, "design_style", "design_preferences.design_style")} />
        <Row label="Websites Liked" value={field(enq, "website_examples_liked", "design_preferences.website_examples_liked")} />
        <Row label="Websites Disliked" value={field(enq, "websites_disliked", "design_preferences.websites_disliked")} />
        <Row label="Competitors" value={field(enq, "competitors", "design_preferences.competitors")} />
        <Row label="Features Needed" value={field(enq, "features_needed", "design_preferences.features_needed")} />
      </SectionCard>

      <SectionCard title="Email Hosting">
        <Row label="Mailbox Count" value={field(enq, "mailbox_count", "email_hosting.mailbox_count")} />
        <Row label="Email Addresses" value={field(enq, "requested_email_addresses", "email_hosting.requested_email_addresses")} />
      </SectionCard>

      <SectionCard title="Timeline & Notes">
        <Row label="Start Timing" value={field(enq, "start_timing", "timeline.start_timing")} />
        <Row label="Launch Deadline" value={field(enq, "launch_deadline", "timeline.launch_deadline")} />
        <Row label="Final Notes" value={field(enq, "final_notes", "final_notes") || field(enq, "additional_notes")} />
      </SectionCard>

      {/* ── Task 2: Admin Copy Sections ── */}
      <SectionCard
        title="📋 Website Brief Copy"
        action={<CopyButton text={brief} label="Copy Brief" />}
      >
        <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/40 rounded-xl p-3 max-h-64 overflow-y-auto">{brief}</pre>
      </SectionCard>

      <SectionCard
        title="🧾 Invoice Copy (Zoho)"
        action={<CopyButton text={invoiceCopy} label="Copy Invoice" />}
      >
        <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/40 rounded-xl p-3">{invoiceCopy}</pre>
      </SectionCard>

      <SectionCard
        title="👤 Zoho Customer Copy"
        action={<CopyButton text={zohoCopy} label="Copy Customer" />}
      >
        <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/40 rounded-xl p-3">{zohoCopy}</pre>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs rounded-xl mt-2"
          onClick={() => downloadZohoCSV(enq)}
        >
          <Download className="h-3 w-3" /> Download Zoho Customer CSV
        </Button>
      </SectionCard>

      {/* ── Task 3: Field Mapping Check ── */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <button
          className="flex items-center justify-between w-full px-4 py-3 border-b border-border bg-muted/30 text-left"
          onClick={() => setShowFieldCheck(!showFieldCheck)}
        >
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            🔍 Field Mapping Check (Admin Debug)
            {missingCount > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-600">
                <AlertTriangle className="h-3 w-3" />{missingCount} missing
              </span>
            )}
            {mismatchCount > 0 && (
              <span className="text-red-600 ml-2">⚠ {mismatchCount} mismatch</span>
            )}
          </p>
          <span className="text-xs text-muted-foreground">{showFieldCheck ? "Hide" : "Show"}</span>
        </button>
        {showFieldCheck && (
          <div className="p-4 space-y-1 max-h-96 overflow-y-auto">
            <p className="text-xs text-muted-foreground mb-3">
              Green = DB column has value. Blue = found in raw_payload. Red = missing from both.
            </p>
            {fieldCheckResults.map((r) => (
              <div
                key={r.label}
                className={`flex items-start gap-2 text-xs px-2 py-1 rounded-lg ${
                  r.missing
                    ? "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300"
                    : r.colVal
                    ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300"
                    : "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300"
                }`}
              >
                <span className="w-44 shrink-0 font-medium">{r.label}</span>
                <span className="flex-1 truncate">
                  {r.missing ? "⚠ MISSING" : r.colVal ? `✓ DB: ${r.colVal.substring(0, 60)}` : `↗ Payload: ${r.payloadVal.substring(0, 60)}`}
                </span>
              </div>
            ))}
            <details className="mt-3">
              <summary className="text-xs text-muted-foreground cursor-pointer">Raw Payload JSON</summary>
              <pre className="text-xs font-mono mt-2 bg-muted/40 rounded-xl p-3 max-h-64 overflow-y-auto whitespace-pre-wrap">
                {JSON.stringify(enq.raw_payload, null, 2) || "null"}
              </pre>
            </details>
          </div>
        )}
      </div>

    </div>
  );
}
