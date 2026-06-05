import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, AlertTriangle, CheckCircle2, Database, FileJson, HelpCircle, Link2, ShieldAlert } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type SeedProposalDetail = {
  id: string;
  proposal_id: string;
  source_batch_id: string;
  domain_name: string | null;
  contact_name: string | null;
  registrar_status: string | null;
  auto_renew: string | null;
  expiry_date: string | null;
  renewal_risk: string | null;
  existing_kbcc_domain_id: string | null;
  existing_kbcc_client_id: string | null;
  existing_kbcc_client_name: string | null;
  existing_hosting_account_id: string | null;
  suggested_client_id: string | null;
  suggested_client_name: string | null;
  confidence: string | null;
  match_reason: string | null;
  conflict_reasons: string | null;
  proposed_actions: string[] | null;
  review_status: string | null;
  admin_decision: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

const formatLabel = (value: string | null | undefined) => {
  if (!value) return "-";
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
};

const formatValue = (value: string | null | undefined) => value || "-";

const riskClass: Record<string, string> = {
  expired: "bg-destructive/10 text-destructive border-destructive/20",
  expires_soon_30_days: "bg-warning/10 text-warning border-warning/20",
  expires_soon_60_days: "bg-info/10 text-info border-info/20",
  ok: "bg-success/10 text-success border-success/20",
  unknown: "bg-muted text-muted-foreground border-border",
};

const confidenceClass: Record<string, string> = {
  high: "bg-success/10 text-success border-success/20",
  medium: "bg-info/10 text-info border-info/20",
  low: "bg-warning/10 text-warning border-warning/20",
  none: "bg-muted text-muted-foreground border-border",
  conflict: "bg-destructive/10 text-destructive border-destructive/20",
};

const statusClass: Record<string, string> = {
  pending_review: "bg-warning/10 text-warning border-warning/20",
  confirmed_existing_client: "bg-success/10 text-success border-success/20",
  manual_create_required: "bg-info/10 text-info border-info/20",
  deferred: "bg-muted text-muted-foreground border-border",
  ignored: "bg-slate-500/10 text-slate-700 border-slate-500/20",
  conflict: "bg-destructive/10 text-destructive border-destructive/20",
};

const Pill = ({ value, colorMap }: { value: string | null | undefined; colorMap: Record<string, string> }) => {
  const key = value || "unknown";
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${colorMap[key] || colorMap.unknown || "bg-muted text-muted-foreground border-border"}`}>
      {formatLabel(value)}
    </span>
  );
};

const DetailCard = ({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) => (
  <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
    <div className="mb-4 flex items-center gap-2">
      <div className="rounded-xl bg-muted p-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <h2 className="text-sm font-heading font-bold text-foreground">{title}</h2>
    </div>
    {children}
  </section>
);

const Field = ({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) => (
  <div className="min-w-0">
    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
    <div className={`mt-1 break-words text-sm text-foreground ${mono ? "font-mono text-xs" : ""}`}>{value}</div>
  </div>
);

const fetchSeedProposalDetail = async (proposalId: string) => {
  const { data, error } = await supabase
    .from("seed_reconciliation_proposals")
    .select("*")
    .eq("proposal_id", proposalId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as SeedProposalDetail | null;
};

const SeedReviewDetail = () => {
  const { proposalId } = useParams();
  const decodedProposalId = proposalId ? decodeURIComponent(proposalId) : "";

  const { data: proposal, isLoading, error } = useQuery({
    queryKey: ["seed_reconciliation_proposals", decodedProposalId],
    queryFn: () => fetchSeedProposalDetail(decodedProposalId),
    enabled: !!decodedProposalId,
  });

  const rawPayloadText = proposal?.raw_payload ? JSON.stringify(proposal.raw_payload, null, 2) : "";
  const rawPayloadPreview = rawPayloadText.length > 2200 ? `${rawPayloadText.slice(0, 2200)}\n...` : rawPayloadText;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="text-sm text-muted-foreground">Loading staged proposal...</div>
      </DashboardLayout>
    );
  }

  if (error || !proposal) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/seed-review"><ArrowLeft className="h-4 w-4" /> Back to Initial Seed Review</Link>
          </Button>
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Staged proposal not found or not visible with the current account permissions.
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
              <Link to="/admin/seed-review"><ArrowLeft className="h-4 w-4" /> Back to Initial Seed Review</Link>
            </Button>
            <h1 className="text-xl font-heading font-extrabold text-foreground sm:text-2xl">{proposal.domain_name || proposal.proposal_id}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              This record is a staging proposal only. It does not confirm ownership and has not updated any client, domain, hosting, billing, DNS, or registrar records.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill value={proposal.renewal_risk} colorMap={riskClass} />
            <Pill value={proposal.confidence} colorMap={confidenceClass} />
            <Pill value={proposal.review_status} colorMap={statusClass} />
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <DetailCard title="Proposal Summary" icon={Database}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Proposal ID" value={proposal.proposal_id} mono />
              <Field label="Source Batch ID" value={proposal.source_batch_id} mono />
              <Field label="Created At" value={formatDateTime(proposal.created_at)} />
              <Field label="Updated At" value={formatDateTime(proposal.updated_at)} />
            </div>
          </DetailCard>

          <DetailCard title="Domain Details" icon={Link2}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Domain Name" value={formatValue(proposal.domain_name)} />
              <Field label="Contact Name" value={formatValue(proposal.contact_name)} />
              <Field label="Registrar Status" value={formatValue(proposal.registrar_status)} />
              <Field label="Auto Renew" value={formatValue(proposal.auto_renew)} />
            </div>
          </DetailCard>

          <DetailCard title="Renewal Risk" icon={AlertTriangle}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Expiry Date" value={formatDateTime(proposal.expiry_date)} />
              <Field label="Renewal Risk" value={<Pill value={proposal.renewal_risk} colorMap={riskClass} />} />
            </div>
          </DetailCard>

          <DetailCard title="Suggested Client Match" icon={CheckCircle2}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Suggested Client ID" value={formatValue(proposal.suggested_client_id)} mono />
              <Field label="Suggested Client Name" value={formatValue(proposal.suggested_client_name)} />
              <Field label="Confidence" value={<Pill value={proposal.confidence} colorMap={confidenceClass} />} />
              <Field label="Match Reason" value={formatValue(proposal.match_reason)} />
            </div>
          </DetailCard>

          <DetailCard title="Existing KBCC Records" icon={Database}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Existing KBCC Domain ID" value={formatValue(proposal.existing_kbcc_domain_id)} mono />
              <Field label="Existing KBCC Client ID" value={formatValue(proposal.existing_kbcc_client_id)} mono />
              <Field label="Existing KBCC Client Name" value={formatValue(proposal.existing_kbcc_client_name)} />
              <Field label="Existing Hosting Account ID" value={formatValue(proposal.existing_hosting_account_id)} mono />
            </div>
          </DetailCard>

          <DetailCard title="Match Evidence" icon={ShieldAlert}>
            <div className="space-y-4">
              <Field label="Match Reason" value={formatValue(proposal.match_reason)} />
              <Field label="Conflict Reasons" value={formatValue(proposal.conflict_reasons)} />
            </div>
          </DetailCard>

          <DetailCard title="Proposed Actions" icon={HelpCircle}>
            {proposal.proposed_actions?.length ? (
              <div className="flex flex-wrap gap-2">
                {proposal.proposed_actions.map((action) => (
                  <span key={action} className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    {formatLabel(action)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No proposed actions recorded.</p>
            )}
          </DetailCard>

          <DetailCard title="Review Status" icon={CheckCircle2}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Review Status" value={<Pill value={proposal.review_status} colorMap={statusClass} />} />
              <Field label="Admin Decision" value={formatLabel(proposal.admin_decision)} />
              <Field label="Reviewed By" value={formatValue(proposal.reviewed_by)} mono />
              <Field label="Reviewed At" value={formatDateTime(proposal.reviewed_at)} />
              <div className="sm:col-span-2">
                <Field label="Notes" value={formatValue(proposal.notes)} />
              </div>
            </div>
          </DetailCard>
        </div>

        <DetailCard title="Raw Payload Preview" icon={FileJson}>
          <details>
            <summary className="cursor-pointer text-sm font-medium text-foreground">Show limited raw payload preview</summary>
            <pre className="mt-4 max-h-96 overflow-auto rounded-xl bg-muted p-4 text-xs text-muted-foreground">
              {rawPayloadPreview || "No raw payload stored."}
            </pre>
          </details>
        </DetailCard>
      </div>
    </DashboardLayout>
  );
};

export default SeedReviewDetail;
