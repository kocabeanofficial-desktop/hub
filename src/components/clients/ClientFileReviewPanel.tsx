import { AlertTriangle, CheckCircle2, Circle, Info, ShieldAlert } from "lucide-react";
import {
  useClientDomains,
  useClientHostingAccounts,
  useClientMailboxes,
  useClientServices,
  useContacts,
} from "@/hooks/useSupabaseData";
import type { DbClient } from "@/types/database";

type ReviewStatus = "Incomplete" | "Needs Client Confirmation" | "Needs Admin Review" | "Portal Blocked";
type CheckState = "complete" | "missing" | "review";

type ReviewCheck = {
  label: string;
  state: CheckState;
  detail: string;
  requiredForPortal: boolean;
  nextAction?: string;
};

type ReviewSection = {
  title: string;
  checks: ReviewCheck[];
};

const hasText = (value: string | null | undefined) => Boolean(value?.trim());
const isValidEmail = (value: string | null | undefined) =>
  Boolean(value?.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()));

const technicalServiceKeywords = ["website", "hosting", "domain", "email", "mail", "ecommerce", "seo"];
const hostingServiceKeywords = ["website", "hosting", "email", "mail", "ecommerce"];
const mailboxServiceKeywords = ["email", "mail"];

const serviceMatches = (serviceCodes: string[], keywords: string[]) =>
  serviceCodes.some((code) => keywords.some((keyword) => code.includes(keyword)));

function buildStatus(
  sections: ReviewSection[],
  portalBlockerCount: number,
  adminReviewCount: number,
  clientConfirmationCount: number,
): ReviewStatus {
  const hasIdentityGap = sections
    .find((section) => section.title === "Client Identity")
    ?.checks.some((check) => check.state === "missing");

  if (hasIdentityGap) return "Incomplete";
  if (adminReviewCount > 0) return "Needs Admin Review";
  if (clientConfirmationCount > 0) return "Needs Client Confirmation";
  if (portalBlockerCount > 0) return "Portal Blocked";
  return "Portal Blocked";
}

function statusClassName(status: ReviewStatus) {
  if (status === "Incomplete") return "bg-destructive/10 text-destructive border-destructive/20";
  if (status === "Needs Admin Review") return "bg-warning/10 text-warning border-warning/20";
  if (status === "Needs Client Confirmation") return "bg-primary/10 text-primary border-primary/20";
  return "bg-destructive/10 text-destructive border-destructive/20";
}

function CheckIcon({ state }: { state: CheckState }) {
  if (state === "complete") return <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />;
  if (state === "review") return <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />;
  return <Circle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />;
}

export function ClientFileReviewPanel({ client }: { client: DbClient }) {
  const { data: contacts = [], isLoading: contactsLoading } = useContacts();
  const { data: services = [], isLoading: servicesLoading } = useClientServices(client.id);
  const { data: domains = [], isLoading: domainsLoading } = useClientDomains(client.id);
  const { data: hostingAccounts = [], isLoading: hostingLoading } = useClientHostingAccounts(client.id);
  const { data: mailboxes = [], isLoading: mailboxesLoading } = useClientMailboxes(client.id);

  const clientContacts = contacts.filter((contact) => contact.client_id === client.id);
  const primaryContact = clientContacts.find((contact) => contact.is_primary);
  const activeServices = services.filter((service) => service.is_active && service.status === "active");
  const serviceCodes = activeServices.map((service) => service.service_code.toLowerCase());
  const needsTechnicalRecords = serviceMatches(serviceCodes, technicalServiceKeywords);
  const needsHostingRecord = serviceMatches(serviceCodes, hostingServiceKeywords);
  const needsMailboxRecord = serviceMatches(serviceCodes, mailboxServiceKeywords);
  const loading = contactsLoading || servicesLoading || domainsLoading || hostingLoading || mailboxesLoading;

  const hasInternalNotes = hasText(client.notes);
  const hasConfirmedDomain = domains.some((domain) => hasText(domain.domain_name));
  const hasActiveDomain = domains.some((domain) => hasText(domain.domain_name) && domain.status === "active");
  const hasHostingAccount = hostingAccounts.some((account) => hasText(account.cpanel_username) || hasText(account.server));
  const hasActiveHosting = hostingAccounts.some((account) => account.status === "active");
  const hasMailbox = mailboxes.some((mailbox) => isValidEmail(mailbox.email_address));

  const sections: ReviewSection[] = [
    {
      title: "Client Identity",
      checks: [
        {
          label: "Business name",
          state: hasText(client.business_name) ? "complete" : "missing",
          detail: hasText(client.business_name) ? client.business_name : "Business name is missing.",
          requiredForPortal: true,
          nextAction: "Confirm the legal or trading client name before portal access.",
        },
        {
          label: "Login email",
          state: isValidEmail(client.email) ? "complete" : "missing",
          detail: isValidEmail(client.email) ? client.email ?? "" : "A valid client email is missing.",
          requiredForPortal: true,
          nextAction: "Confirm the login email with the authorised requester.",
        },
        {
          label: "Internal notes signal",
          state: hasInternalNotes ? "review" : "complete",
          detail: hasInternalNotes ? "Internal notes present." : "No internal notes signal on this client.",
          requiredForPortal: false,
          nextAction: "Review admin-only notes separately before sharing anything with the client.",
        },
      ],
    },
    {
      title: "Contact Details",
      checks: [
        {
          label: "Phone number",
          state: hasText(client.phone) ? "complete" : "review",
          detail: hasText(client.phone) ? client.phone ?? "" : "Phone number is not recorded.",
          requiredForPortal: false,
          nextAction: "Add or confirm a phone number for support and billing follow-up.",
        },
        {
          label: "Primary contact",
          state: primaryContact ? "complete" : "missing",
          detail: primaryContact?.full_name || "No primary contact is marked for this client.",
          requiredForPortal: true,
          nextAction: "Mark the authorised requester as the primary contact.",
        },
        {
          label: "Primary contact email",
          state: isValidEmail(primaryContact?.email) ? "complete" : "review",
          detail: isValidEmail(primaryContact?.email)
            ? primaryContact?.email ?? ""
            : "Primary contact email still needs confirmation.",
          requiredForPortal: true,
          nextAction: "Confirm the requester email matches the intended portal user.",
        },
      ],
    },
    {
      title: "Business & Billing Details",
      checks: [
        {
          label: "Company registration",
          state: hasText(client.company_registration) ? "complete" : "review",
          detail: hasText(client.company_registration)
            ? client.company_registration ?? ""
            : "Company registration is not recorded.",
          requiredForPortal: false,
          nextAction: "Capture registration details where available for billing records.",
        },
        {
          label: "VAT number",
          state: hasText(client.vat_number) ? "complete" : "review",
          detail: hasText(client.vat_number) ? client.vat_number ?? "" : "VAT number is not recorded.",
          requiredForPortal: false,
          nextAction: "Capture VAT details if the client requires VAT invoices.",
        },
        {
          label: "Industry",
          state: hasText(client.industry) ? "complete" : "review",
          detail: hasText(client.industry) ? client.industry ?? "" : "Industry is not recorded.",
          requiredForPortal: false,
          nextAction: "Add industry context to support service setup and reporting.",
        },
      ],
    },
    {
      title: "Domains",
      checks: [
        {
          label: "Website URL",
          state: hasText(client.website_url) ? "complete" : "review",
          detail: hasText(client.website_url) ? client.website_url ?? "" : "Website URL is not recorded.",
          requiredForPortal: false,
          nextAction: "Add the website URL if the client has a live or planned site.",
        },
        {
          label: "Domain record",
          state: hasConfirmedDomain ? "complete" : needsTechnicalRecords ? "missing" : "review",
          detail: hasConfirmedDomain
            ? `${domains.length} domain record${domains.length === 1 ? "" : "s"} linked.`
            : "No domain record is linked to this client.",
          requiredForPortal: needsTechnicalRecords,
          nextAction: "Confirm domain ownership before portal access for technical clients.",
        },
        {
          label: "Active domain status",
          state: hasActiveDomain ? "complete" : needsTechnicalRecords ? "review" : "complete",
          detail: hasActiveDomain ? "At least one linked domain is active." : "No active domain status confirmed.",
          requiredForPortal: needsTechnicalRecords,
          nextAction: "Check domain status and ownership source before relying on this record.",
        },
      ],
    },
    {
      title: "Hosting & Mailboxes",
      checks: [
        {
          label: "Hosting account",
          state: hasHostingAccount ? "complete" : needsHostingRecord ? "missing" : "review",
          detail: hasHostingAccount
            ? `${hostingAccounts.length} hosting account${hostingAccounts.length === 1 ? "" : "s"} linked.`
            : "No hosting account is linked to this client.",
          requiredForPortal: needsHostingRecord,
          nextAction: "Link the confirmed hosting account only after ownership review.",
        },
        {
          label: "Active hosting status",
          state: hasActiveHosting ? "complete" : needsHostingRecord ? "review" : "complete",
          detail: hasActiveHosting ? "At least one hosting account is active." : "No active hosting status confirmed.",
          requiredForPortal: needsHostingRecord,
          nextAction: "Confirm hosting status before exposing technical support details.",
        },
        {
          label: "Mailbox records",
          state: hasMailbox ? "complete" : needsMailboxRecord ? "missing" : "review",
          detail: hasMailbox
            ? `${mailboxes.length} mailbox record${mailboxes.length === 1 ? "" : "s"} linked.`
            : "No mailbox records are linked to this client.",
          requiredForPortal: needsMailboxRecord,
          nextAction: "Add mailbox records only through the approved admin workflow.",
        },
      ],
    },
    {
      title: "Services & Billing",
      checks: [
        {
          label: "Active services",
          state: activeServices.length > 0 ? "complete" : "missing",
          detail:
            activeServices.length > 0
              ? `${activeServices.length} active service${activeServices.length === 1 ? "" : "s"} linked.`
              : "No active client_services records are linked.",
          requiredForPortal: true,
          nextAction: "Confirm the service relationship before portal access.",
        },
        {
          label: "Billing cycle signal",
          state: activeServices.some((service) => hasText(service.billing_cycle)) ? "complete" : "review",
          detail: activeServices.some((service) => hasText(service.billing_cycle))
            ? "At least one active service has a billing cycle."
            : "No billing cycle is recorded on active services.",
          requiredForPortal: false,
          nextAction: "Check billing cycle details before relying on renewal views.",
        },
      ],
    },
    {
      title: "Portal Readiness",
      checks: [
        {
          label: "Authorised requester",
          state: primaryContact ? "review" : "missing",
          detail: primaryContact
            ? "Primary contact exists; requester authority still needs confirmation."
            : "No requester can be confirmed from current records.",
          requiredForPortal: true,
          nextAction: "Confirm the person who may receive portal access.",
        },
        {
          label: "POPIA/data consent",
          state: "missing",
          detail: "Consent evidence is not modelled in the current client record.",
          requiredForPortal: true,
          nextAction: "Collect and record consent through an approved future workflow.",
        },
        {
          label: "Duplicate check",
          state: "review",
          detail: "Duplicate review is not automated in this panel.",
          requiredForPortal: true,
          nextAction: "Manually check for duplicate client records before activating portal access.",
        },
      ],
    },
  ];

  const allChecks = sections.flatMap((section) => section.checks);
  const missingRequiredChecks = allChecks.filter((check) => check.requiredForPortal && check.state !== "complete");
  const missingOrReviewChecks = allChecks.filter((check) => check.state !== "complete");
  const adminReviewCount = sections
    .filter((section) => ["Domains", "Hosting & Mailboxes", "Services & Billing"].includes(section.title))
    .flatMap((section) => section.checks)
    .filter((check) => check.state !== "complete").length;
  const clientConfirmationCount = sections
    .filter((section) => ["Contact Details", "Portal Readiness"].includes(section.title))
    .flatMap((section) => section.checks)
    .filter((check) => check.state !== "complete").length;
  const reviewStatus = buildStatus(sections, missingRequiredChecks.length, adminReviewCount, clientConfirmationCount);
  const nextAction = missingRequiredChecks[0]?.nextAction || missingOrReviewChecks[0]?.nextAction || "Keep portal access paused pending admin review.";

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-heading font-semibold text-foreground">Client File Review</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Read-only readiness checklist for completing this client file before portal access.
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClassName(reviewStatus)}`}>
          {loading ? "Checking..." : reviewStatus}
        </span>
      </div>

      <div className="mt-4 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 flex items-start gap-2">
        <ShieldAlert className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
        <p className="text-sm text-foreground">
          Portal access must not be activated until client identity, login email, authorised requester,
          POPIA/data consent, and duplicate checks are complete.
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {sections.map((section) => (
          <div key={section.title} className="rounded-lg border border-border bg-background/50 p-4">
            <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
            <ul className="mt-3 space-y-3">
              {section.checks.map((check) => (
                <li key={`${section.title}-${check.label}`} className="flex gap-2">
                  <CheckIcon state={check.state} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground">{check.label}</p>
                      {check.requiredForPortal && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Portal gate
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Next recommended action</h3>
            <p className="text-sm text-muted-foreground mt-1">{nextAction}</p>
          </div>
        </div>

        {missingOrReviewChecks.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Missing or needs review
            </p>
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {missingOrReviewChecks.slice(0, 8).map((check) => (
                <li key={`missing-${check.label}`} className="text-xs text-muted-foreground">
                  {check.label}: {check.nextAction}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
