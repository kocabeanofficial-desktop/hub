import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, AlertTriangle, CheckCircle2, Database, FileJson, HelpCircle, Link2, Loader2, Pencil, Save, ShieldAlert, X } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
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

type ProposalReviewForm = {
  domain_name: string;
  contact_name: string;
  registrar_status: string;
  auto_renew: string;
  expiry_date: string;
  renewal_risk: string;
  suggested_client_id: string;
  suggested_client_name: string;
  existing_kbcc_client_id: string;
  existing_kbcc_client_name: string;
  existing_hosting_account_id: string;
  confidence: string;
  match_reason: string;
  conflict_reasons: string;
  proposed_actions: string;
  review_status: string;
  admin_decision: string;
  notes: string;
};

const NONE_VALUE = "__none__";

const renewalRiskOptions = ["expired", "expires_soon_30_days", "expires_soon_60_days", "ok", "unknown"] as const;
const confidenceOptions = ["high", "medium", "low", "none", "conflict"] as const;
const reviewStatusOptions = ["pending_review", "confirmed_existing_client", "manual_create_required", "deferred", "ignored", "conflict"] as const;
const adminDecisionOptions = [
  "attach_to_existing",
  "create_client_manually",
  "create_service_only",
  "create_domain_only",
  "create_hosting_only",
  "ignore",
  "defer",
] as const;

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

const formatDateInput = (value: string | null | undefined) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
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

const EditableField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="min-w-0">
    <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
    {children}
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

const toForm = (proposal: SeedProposalDetail): ProposalReviewForm => ({
  domain_name: proposal.domain_name ?? "",
  contact_name: proposal.contact_name ?? "",
  registrar_status: proposal.registrar_status ?? "",
  auto_renew: proposal.auto_renew ?? "",
  expiry_date: formatDateInput(proposal.expiry_date),
  renewal_risk: proposal.renewal_risk || "unknown",
  suggested_client_id: proposal.suggested_client_id ?? "",
  suggested_client_name: proposal.suggested_client_name ?? "",
  existing_kbcc_client_id: proposal.existing_kbcc_client_id ?? "",
  existing_kbcc_client_name: proposal.existing_kbcc_client_name ?? "",
  existing_hosting_account_id: proposal.existing_hosting_account_id ?? "",
  confidence: proposal.confidence || "none",
  match_reason: proposal.match_reason ?? "",
  conflict_reasons: proposal.conflict_reasons ?? "",
  proposed_actions: proposal.proposed_actions?.join("; ") ?? "",
  review_status: proposal.review_status || "pending_review",
  admin_decision: proposal.admin_decision ?? "",
  notes: proposal.notes ?? "",
});

const blankToNull = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizeProposedActions = (value: string) =>
  value
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);

const enumIncludes = <T extends readonly string[]>(values: T, value: string) => values.includes(value as T[number]);

const SeedReviewDetail = () => {
  const { proposalId } = useParams();
  const { toast } = useToast();
  const decodedProposalId = proposalId ? decodeURIComponent(proposalId) : "";
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<ProposalReviewForm | null>(null);

  const { data: proposal, isLoading, error, refetch } = useQuery({
    queryKey: ["seed_reconciliation_proposals", decodedProposalId],
    queryFn: () => fetchSeedProposalDetail(decodedProposalId),
    enabled: !!decodedProposalId,
  });

  useEffect(() => {
    if (proposal && !isEditing) setForm(toForm(proposal));
  }, [isEditing, proposal]);

  const updateForm = (field: keyof ProposalReviewForm, value: string) => {
    setForm((current) => current ? { ...current, [field]: value } : current);
  };

  const cancelEdit = () => {
    if (proposal) setForm(toForm(proposal));
    setIsEditing(false);
  };

  const saveProposalReview = async () => {
    if (!proposal || !form) return;

    if (!enumIncludes(renewalRiskOptions, form.renewal_risk)) {
      toast({ title: "Validation error", description: "Renewal risk is not valid.", variant: "destructive" });
      return;
    }
    if (!enumIncludes(confidenceOptions, form.confidence)) {
      toast({ title: "Validation error", description: "Confidence is not valid.", variant: "destructive" });
      return;
    }
    if (!enumIncludes(reviewStatusOptions, form.review_status)) {
      toast({ title: "Validation error", description: "Review status is not valid.", variant: "destructive" });
      return;
    }
    if (form.admin_decision && !enumIncludes(adminDecisionOptions, form.admin_decision)) {
      toast({ title: "Validation error", description: "Admin decision is not valid.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        domain_name: blankToNull(form.domain_name),
        contact_name: blankToNull(form.contact_name),
        registrar_status: blankToNull(form.registrar_status),
        auto_renew: blankToNull(form.auto_renew),
        expiry_date: form.expiry_date ? `${form.expiry_date}T00:00:00.000Z` : null,
        renewal_risk: form.renewal_risk,
        suggested_client_id: blankToNull(form.suggested_client_id),
        suggested_client_name: blankToNull(form.suggested_client_name),
        existing_kbcc_client_id: blankToNull(form.existing_kbcc_client_id),
        existing_kbcc_client_name: blankToNull(form.existing_kbcc_client_name),
        existing_hosting_account_id: blankToNull(form.existing_hosting_account_id),
        confidence: form.confidence,
        match_reason: blankToNull(form.match_reason),
        conflict_reasons: blankToNull(form.conflict_reasons),
        proposed_actions: normalizeProposedActions(form.proposed_actions),
        review_status: form.review_status,
        admin_decision: blankToNull(form.admin_decision),
        notes: blankToNull(form.notes),
      };

      const { error: saveError } = await supabase
        .from("seed_reconciliation_proposals")
        .update(payload)
        .eq("id", proposal.id);

      if (saveError) throw saveError;

      await refetch();
      setIsEditing(false);
      toast({ title: "Staging proposal saved", description: "Only the seed reconciliation proposal row was updated." });
    } catch (saveError) {
      toast({
        title: "Save failed",
        description: saveError instanceof Error ? saveError.message : "Could not save the staged proposal.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

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
            <p className="mt-2 text-sm text-muted-foreground">
              Saving this form updates the staging proposal only. It does not create, link, or update any client, domain, hosting, billing, DNS, registrar, WHM, or Zoho record.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <div className="flex flex-wrap gap-2">
              <Pill value={proposal.renewal_risk} colorMap={riskClass} />
              <Pill value={proposal.confidence} colorMap={confidenceClass} />
              <Pill value={proposal.review_status} colorMap={statusClass} />
            </div>
            <div className="flex flex-wrap gap-2">
              {isEditing ? (
                <>
                  <Button type="button" variant="outline" size="sm" onClick={cancelEdit} disabled={isSaving}>
                    <X className="h-4 w-4" /> Cancel
                  </Button>
                  <Button type="button" size="sm" onClick={saveProposalReview} disabled={isSaving || !form}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Proposal Review
                  </Button>
                </>
              ) : (
                <Button type="button" size="sm" onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4" /> Edit Proposal
                </Button>
              )}
            </div>
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
              {isEditing && form ? (
                <>
                  <EditableField label="Domain Name"><Input value={form.domain_name} onChange={(event) => updateForm("domain_name", event.target.value)} /></EditableField>
                  <EditableField label="Contact Name"><Input value={form.contact_name} onChange={(event) => updateForm("contact_name", event.target.value)} /></EditableField>
                  <EditableField label="Registrar Status"><Input value={form.registrar_status} onChange={(event) => updateForm("registrar_status", event.target.value)} /></EditableField>
                  <EditableField label="Auto Renew"><Input value={form.auto_renew} onChange={(event) => updateForm("auto_renew", event.target.value)} /></EditableField>
                </>
              ) : (
                <>
                  <Field label="Domain Name" value={formatValue(proposal.domain_name)} />
                  <Field label="Contact Name" value={formatValue(proposal.contact_name)} />
                  <Field label="Registrar Status" value={formatValue(proposal.registrar_status)} />
                  <Field label="Auto Renew" value={formatValue(proposal.auto_renew)} />
                </>
              )}
            </div>
          </DetailCard>

          <DetailCard title="Renewal Risk" icon={AlertTriangle}>
            <div className="grid gap-4 sm:grid-cols-2">
              {isEditing && form ? (
                <>
                  <EditableField label="Expiry Date"><Input type="date" value={form.expiry_date} onChange={(event) => updateForm("expiry_date", event.target.value)} /></EditableField>
                  <EditableField label="Renewal Risk">
                    <Select value={form.renewal_risk} onValueChange={(value) => updateForm("renewal_risk", value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {renewalRiskOptions.map((option) => <SelectItem key={option} value={option}>{formatLabel(option)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </EditableField>
                </>
              ) : (
                <>
                  <Field label="Expiry Date" value={formatDateTime(proposal.expiry_date)} />
                  <Field label="Renewal Risk" value={<Pill value={proposal.renewal_risk} colorMap={riskClass} />} />
                </>
              )}
            </div>
          </DetailCard>

          <DetailCard title="Suggested Client Match" icon={CheckCircle2}>
            <div className="grid gap-4 sm:grid-cols-2">
              {isEditing && form ? (
                <>
                  <EditableField label="Suggested Client ID"><Input value={form.suggested_client_id} onChange={(event) => updateForm("suggested_client_id", event.target.value)} /></EditableField>
                  <EditableField label="Suggested Client Name"><Input value={form.suggested_client_name} onChange={(event) => updateForm("suggested_client_name", event.target.value)} /></EditableField>
                  <EditableField label="Confidence">
                    <Select value={form.confidence} onValueChange={(value) => updateForm("confidence", value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {confidenceOptions.map((option) => <SelectItem key={option} value={option}>{formatLabel(option)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </EditableField>
                  <EditableField label="Match Reason"><Textarea value={form.match_reason} onChange={(event) => updateForm("match_reason", event.target.value)} rows={3} /></EditableField>
                </>
              ) : (
                <>
                  <Field label="Suggested Client ID" value={formatValue(proposal.suggested_client_id)} mono />
                  <Field label="Suggested Client Name" value={formatValue(proposal.suggested_client_name)} />
                  <Field label="Confidence" value={<Pill value={proposal.confidence} colorMap={confidenceClass} />} />
                  <Field label="Match Reason" value={formatValue(proposal.match_reason)} />
                </>
              )}
            </div>
          </DetailCard>

          <DetailCard title="Existing KBCC Records" icon={Database}>
            <div className="grid gap-4 sm:grid-cols-2">
              {isEditing && form ? (
                <>
                  <Field label="Existing KBCC Domain ID" value={formatValue(proposal.existing_kbcc_domain_id)} mono />
                  <EditableField label="Existing KBCC Client ID"><Input value={form.existing_kbcc_client_id} onChange={(event) => updateForm("existing_kbcc_client_id", event.target.value)} /></EditableField>
                  <EditableField label="Existing KBCC Client Name"><Input value={form.existing_kbcc_client_name} onChange={(event) => updateForm("existing_kbcc_client_name", event.target.value)} /></EditableField>
                  <EditableField label="Existing Hosting Account ID"><Input value={form.existing_hosting_account_id} onChange={(event) => updateForm("existing_hosting_account_id", event.target.value)} /></EditableField>
                </>
              ) : (
                <>
                  <Field label="Existing KBCC Domain ID" value={formatValue(proposal.existing_kbcc_domain_id)} mono />
                  <Field label="Existing KBCC Client ID" value={formatValue(proposal.existing_kbcc_client_id)} mono />
                  <Field label="Existing KBCC Client Name" value={formatValue(proposal.existing_kbcc_client_name)} />
                  <Field label="Existing Hosting Account ID" value={formatValue(proposal.existing_hosting_account_id)} mono />
                </>
              )}
            </div>
          </DetailCard>

          <DetailCard title="Match Evidence" icon={ShieldAlert}>
            <div className="space-y-4">
              {isEditing && form ? (
                <>
                  <EditableField label="Match Reason"><Textarea value={form.match_reason} onChange={(event) => updateForm("match_reason", event.target.value)} rows={3} /></EditableField>
                  <EditableField label="Conflict Reasons"><Textarea value={form.conflict_reasons} onChange={(event) => updateForm("conflict_reasons", event.target.value)} rows={3} /></EditableField>
                </>
              ) : (
                <>
                  <Field label="Match Reason" value={formatValue(proposal.match_reason)} />
                  <Field label="Conflict Reasons" value={formatValue(proposal.conflict_reasons)} />
                </>
              )}
            </div>
          </DetailCard>

          <DetailCard title="Proposed Actions" icon={HelpCircle}>
            {isEditing && form ? (
              <EditableField label="Proposed Actions">
                <Textarea
                  value={form.proposed_actions}
                  onChange={(event) => updateForm("proposed_actions", event.target.value)}
                  rows={4}
                  placeholder="Separate actions with semicolons"
                />
              </EditableField>
            ) : proposal.proposed_actions?.length ? (
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
              {isEditing && form ? (
                <>
                  <EditableField label="Review Status">
                    <Select value={form.review_status} onValueChange={(value) => updateForm("review_status", value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {reviewStatusOptions.map((option) => <SelectItem key={option} value={option}>{formatLabel(option)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </EditableField>
                  <EditableField label="Admin Decision">
                    <Select
                      value={form.admin_decision || NONE_VALUE}
                      onValueChange={(value) => updateForm("admin_decision", value === NONE_VALUE ? "" : value)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>No decision</SelectItem>
                        {adminDecisionOptions.map((option) => <SelectItem key={option} value={option}>{formatLabel(option)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </EditableField>
                </>
              ) : (
                <>
                  <Field label="Review Status" value={<Pill value={proposal.review_status} colorMap={statusClass} />} />
                  <Field label="Admin Decision" value={formatLabel(proposal.admin_decision)} />
                </>
              )}
              <Field label="Reviewed By" value={formatValue(proposal.reviewed_by)} mono />
              <Field label="Reviewed At" value={formatDateTime(proposal.reviewed_at)} />
              <div className="sm:col-span-2">
                {isEditing && form ? (
                  <EditableField label="Notes"><Textarea value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} rows={4} /></EditableField>
                ) : (
                  <Field label="Notes" value={formatValue(proposal.notes)} />
                )}
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
