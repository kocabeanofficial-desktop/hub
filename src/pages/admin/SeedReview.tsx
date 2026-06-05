import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Eye, Filter, HelpCircle, ListChecks, Search, ShieldAlert, Timer } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

type SeedProposal = {
  id: string;
  proposal_id: string;
  source_batch_id: string;
  domain_name: string | null;
  contact_name: string | null;
  expiry_date: string | null;
  renewal_risk: "expired" | "expires_soon_30_days" | "expires_soon_60_days" | "ok" | "unknown" | string | null;
  confidence: "high" | "medium" | "low" | "none" | "conflict" | string | null;
  suggested_client_name: string | null;
  review_status: "pending_review" | "confirmed_existing_client" | "manual_create_required" | "deferred" | "ignored" | "conflict" | string | null;
  admin_decision: string | null;
  created_at: string;
};

type RenewalRiskFilter = "all" | "expired" | "expires_soon_30_days" | "expires_soon_60_days" | "ok";
type ConfidenceFilter = "all" | "high" | "medium" | "low" | "none" | "conflict";
type ReviewStatusFilter = "all" | "pending_review" | "confirmed_existing_client" | "manual_create_required" | "deferred" | "ignored" | "conflict";

const formatLabel = (value: string | null | undefined) => {
  if (!value) return "-";
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" });
};

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
    <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${colorMap[key] || colorMap.unknown || "bg-muted text-muted-foreground border-border"}`}>
      {formatLabel(value)}
    </span>
  );
};

const fetchSeedProposals = async () => {
  const { data, error } = await supabase
    .from("seed_reconciliation_proposals")
    .select("id, proposal_id, source_batch_id, domain_name, contact_name, expiry_date, renewal_risk, confidence, suggested_client_name, review_status, admin_decision, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as SeedProposal[];
};

const SeedReview = () => {
  const [renewalRisk, setRenewalRisk] = useState<RenewalRiskFilter>("all");
  const [confidence, setConfidence] = useState<ConfidenceFilter>("all");
  const [reviewStatus, setReviewStatus] = useState<ReviewStatusFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: proposals = [], isLoading, error } = useQuery({
    queryKey: ["seed_reconciliation_proposals"],
    queryFn: fetchSeedProposals,
  });

  const summary = useMemo(() => ({
    total: proposals.length,
    expired: proposals.filter((proposal) => proposal.renewal_risk === "expired").length,
    expiring30: proposals.filter((proposal) => proposal.renewal_risk === "expires_soon_30_days").length,
    conflicts: proposals.filter((proposal) => proposal.confidence === "conflict" || proposal.review_status === "conflict").length,
    noMatch: proposals.filter((proposal) => proposal.confidence === "none").length,
    highConfidence: proposals.filter((proposal) => proposal.confidence === "high").length,
    pendingReview: proposals.filter((proposal) => proposal.review_status === "pending_review").length,
  }), [proposals]);

  const filteredProposals = useMemo(() => {
    const text = searchTerm.trim().toLowerCase();
    return proposals.filter((proposal) => {
      const matchesRisk = renewalRisk === "all" || proposal.renewal_risk === renewalRisk;
      const matchesConfidence = confidence === "all" || proposal.confidence === confidence;
      const matchesReviewStatus = reviewStatus === "all" || proposal.review_status === reviewStatus;
      const matchesSearch =
        !text ||
        [proposal.domain_name, proposal.contact_name, proposal.suggested_client_name]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(text));

      return matchesRisk && matchesConfidence && matchesReviewStatus && matchesSearch;
    });
  }, [confidence, proposals, renewalRisk, reviewStatus, searchTerm]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">Initial Seed Review</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              This is a staging review area. Rows here are proposals only and do not confirm ownership or update client/domain/hosting records.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-7">
          <StatCard title="Total Proposals" value={summary.total} icon={ListChecks} variant="primary" />
          <StatCard title="Expired" value={summary.expired} icon={AlertTriangle} variant="warning" />
          <StatCard title="Expiring 30 Days" value={summary.expiring30} icon={Timer} variant="warning" />
          <StatCard title="Conflicts" value={summary.conflicts} icon={ShieldAlert} variant="warning" />
          <StatCard title="No Match" value={summary.noMatch} icon={HelpCircle} variant="default" />
          <StatCard title="High Confidence" value={summary.highConfidence} icon={CheckCircle2} variant="success" />
          <StatCard title="Pending Review" value={summary.pendingReview} icon={Filter} variant="info" />
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-4 sm:p-5">
            <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search domain, contact, or suggested client"
                  className="pl-9"
                />
              </div>
              <Select value={renewalRisk} onValueChange={(value) => setRenewalRisk(value as RenewalRiskFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="Renewal risk" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All renewal risks</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="expires_soon_30_days">Expires within 30 days</SelectItem>
                  <SelectItem value="expires_soon_60_days">Expires within 60 days</SelectItem>
                  <SelectItem value="ok">OK</SelectItem>
                </SelectContent>
              </Select>
              <Select value={confidence} onValueChange={(value) => setConfidence(value as ConfidenceFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="Confidence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All confidence</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="conflict">Conflict</SelectItem>
                </SelectContent>
              </Select>
              <Select value={reviewStatus} onValueChange={(value) => setReviewStatus(value as ReviewStatusFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="Review status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All review statuses</SelectItem>
                  <SelectItem value="pending_review">Pending review</SelectItem>
                  <SelectItem value="confirmed_existing_client">Confirmed existing client</SelectItem>
                  <SelectItem value="manual_create_required">Manual create required</SelectItem>
                  <SelectItem value="deferred">Deferred</SelectItem>
                  <SelectItem value="ignored">Ignored</SelectItem>
                  <SelectItem value="conflict">Conflict</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Domain</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expiry Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Renewal Risk</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Confidence</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Suggested Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Review Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin Decision</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Loading staged proposals...</td>
                  </tr>
                )}
                {!isLoading && error && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-destructive">Could not load staged proposals.</td>
                  </tr>
                )}
                {!isLoading && !error && filteredProposals.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No staged proposals match the current filters.</td>
                  </tr>
                )}
                {!isLoading && !error && filteredProposals.map((proposal) => (
                  <tr key={proposal.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3.5 font-medium text-foreground">{proposal.domain_name || "-"}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{proposal.contact_name || "-"}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{formatDate(proposal.expiry_date)}</td>
                    <td className="px-4 py-3.5"><Pill value={proposal.renewal_risk} colorMap={riskClass} /></td>
                    <td className="px-4 py-3.5"><Pill value={proposal.confidence} colorMap={confidenceClass} /></td>
                    <td className="px-4 py-3.5 text-muted-foreground">{proposal.suggested_client_name || "-"}</td>
                    <td className="px-4 py-3.5"><Pill value={proposal.review_status} colorMap={statusClass} /></td>
                    <td className="px-4 py-3.5 text-muted-foreground">{formatLabel(proposal.admin_decision)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <Button asChild type="button" variant="outline" size="sm">
                        <Link to={`/admin/seed-review/${encodeURIComponent(proposal.proposal_id)}`}>
                          <Eye className="h-4 w-4" />
                          View
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SeedReview;
