import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import {
  useClients,
  useDomains,
  useHostingAccounts,
  useMailboxes,
  useWhmAccounts,
  useWhmSyncRuns,
} from "@/hooks/useSupabaseData";
import { Server, Globe, Mail, ShieldAlert, AlertTriangle, Loader2, Activity, CheckCircle2, HelpCircle, Link2Off, XCircle, Ban, HardDrive } from "lucide-react";
import { useMemo } from "react";
import type { DbWhmAccount } from "@/types/database";

const hostingStatusColors: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  suspended: "bg-destructive/10 text-destructive border-destructive/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  over_quota: "bg-[hsl(45,80%,50%)]/10 text-[hsl(45,80%,40%)] border-[hsl(45,80%,50%)]/20",
};

const sslStatusColors: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  expired: "bg-destructive/10 text-destructive border-destructive/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  none: "bg-muted text-muted-foreground border-border",
};

const matchStatusColors: Record<string, string> = {
  matched: "bg-success/10 text-success border-success/20",
  possible_match: "bg-info/10 text-info border-info/20",
  unmatched: "bg-warning/10 text-warning border-warning/20",
  conflict: "bg-destructive/10 text-destructive border-destructive/20",
};

const riskBadgeColors: Record<string, string> = {
  healthy: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  critical: "bg-orange-100 text-orange-700 border-orange-200",
  over: "bg-destructive/10 text-destructive border-destructive/20",
  suspended: "bg-destructive/10 text-destructive border-destructive/20",
};

const StatusPill = ({ status, colorMap }: { status: string; colorMap: Record<string, string> }) => {
  const style = colorMap[status] || "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      {status.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())}
    </span>
  );
};

const RiskBadge = ({ label, level }: { label: string; level: string }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${riskBadgeColors[level] || riskBadgeColors.warning}`}>
    {label}
  </span>
);

const MonitoringCard = ({
  title,
  value,
  tone,
}: {
  title: string;
  value: number;
  tone: "healthy" | "warning" | "critical" | "over";
}) => {
  const style =
    tone === "healthy"
      ? "bg-success/[0.04] border-success/15"
      : tone === "warning"
      ? "bg-warning/[0.05] border-warning/20"
      : tone === "critical"
      ? "bg-orange-50 border-orange-200"
      : "bg-destructive/[0.05] border-destructive/20";
  const iconStyle =
    tone === "healthy"
      ? "bg-success/10 text-success"
      : tone === "warning"
      ? "bg-warning/10 text-warning"
      : tone === "critical"
      ? "bg-orange-100 text-orange-700"
      : "bg-destructive/10 text-destructive";

  return (
    <div className={`rounded-2xl p-4 sm:p-5 border ${style}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl sm:text-3xl font-heading font-bold text-foreground">{value}</p>
        </div>
        <div className={`rounded-xl p-2.5 ${iconStyle}`}>
          {title.toLowerCase().includes("suspended") ? <Ban className="h-5 w-5" /> : <HardDrive className="h-5 w-5" />}
        </div>
      </div>
    </div>
  );
};

const formatDateTime = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" }) : "—";

const formatNumber = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? value.toLocaleString("en-ZA") : "—";

const formatUsage = (used: number | null, quota: number | null) => {
  if (used == null && quota == null) return "—";
  if (quota == null || quota <= 0) return `${formatNumber(used)} MB`;
  return `${formatNumber(used)} / ${formatNumber(quota)} MB`;
};

const calculateUsagePercent = (used: number | null, quota: number | null) => {
  if (used == null || quota == null || quota <= 0) return null;
  return (used / quota) * 100;
};

const formatPercent = (value: number | null) =>
  value == null || !Number.isFinite(value) ? "—" : `${Math.round(value)}%`;

const classifyUsage = (percent: number | null) => {
  if (percent == null) return null;
  if (percent >= 100) return "over";
  if (percent >= 85) return "critical";
  if (percent >= 70) return "warning";
  return "healthy";
};

const normalizeStatusValue = (value: string | null | undefined) => value?.trim().toLowerCase() || "";

const isSuspended = (account: DbWhmAccount) => {
  const status = normalizeStatusValue(account.status);
  const rawStatus = normalizeStatusValue(account.raw_status);

  if (status === "suspended") return true;
  if (["not suspended", "unsuspended", "active", "not_suspended"].includes(rawStatus)) return false;

  return ["suspended", "true", "1"].includes(rawStatus);
};

const getSuspensionReason = (account: DbWhmAccount) => {
  if (!isSuspended(account)) return "â€”";

  const rawStatus = normalizeStatusValue(account.raw_status);
  if (!rawStatus || ["suspended", "true", "1", "not suspended", "unsuspended", "active", "not_suspended"].includes(rawStatus)) {
    return "Reason not captured";
  }

  return account.raw_status;
};

const getSuspensionDate = (account: DbWhmAccount) => (isSuspended(account) ? "Date not captured" : "â€”");

const getAccountRisks = (account: DbWhmAccount) => {
  const diskPercent = calculateUsagePercent(account.disk_used_mb, account.disk_quota_mb);
  const bandwidthPercent = calculateUsagePercent(account.bandwidth_used_mb, account.bandwidth_quota_mb);
  const diskClass = classifyUsage(diskPercent);
  const bandwidthClass = classifyUsage(bandwidthPercent);
  const risks: Array<{ label: string; level: string }> = [];

  if (isSuspended(account)) risks.push({ label: "Suspended", level: "suspended" });
  if (diskClass === "warning") risks.push({ label: "Disk warning", level: "warning" });
  if (diskClass === "critical") risks.push({ label: "Disk critical", level: "critical" });
  if (diskClass === "over") risks.push({ label: "Over quota", level: "over" });
  if (bandwidthClass === "warning") risks.push({ label: "Bandwidth warning", level: "warning" });
  if (bandwidthClass === "critical") risks.push({ label: "Bandwidth critical", level: "critical" });
  if (bandwidthClass === "over") risks.push({ label: "Bandwidth over limit", level: "over" });

  return { risks, diskPercent, bandwidthPercent, diskClass, bandwidthClass };
};

const getRiskRowClass = (account: DbWhmAccount) => {
  const { risks } = getAccountRisks(account);
  if (risks.some((risk) => risk.level === "suspended" || risk.level === "over")) return "bg-destructive/5";
  if (risks.some((risk) => risk.level === "critical")) return "bg-orange-50/80";
  if (risks.some((risk) => risk.level === "warning")) return "bg-warning/5";
  if (account.match_status === "conflict") return "bg-destructive/5";
  if (account.match_status === "unmatched") return "bg-warning/5";
  return "hover:bg-muted/20 transition-colors";
};

const Hosting = () => {
  const { data: accounts = [], isLoading: loadingAccounts } = useHostingAccounts();
  const { data: domains = [], isLoading: loadingDomains } = useDomains();
  const { data: mailboxes = [], isLoading: loadingMailboxes } = useMailboxes();
  const { data: clients = [] } = useClients();
  const { data: whmAccounts = [], isLoading: loadingWhmAccounts } = useWhmAccounts();
  const { data: whmSyncRuns = [], isLoading: loadingWhmSyncRuns } = useWhmSyncRuns();

  const clientMap = useMemo(() => {
    const m: Record<string, string> = {};
    clients.forEach((c) => (m[c.id] = c.business_name));
    return m;
  }, [clients]);

  const isLoading = loadingAccounts || loadingDomains || loadingMailboxes;
  const loadingWhm = loadingWhmAccounts || loadingWhmSyncRuns;

  const activeDomains = domains.filter((d) => d.status === "active").length;
  const activeMailboxes = mailboxes.filter((m) => m.status === "active").length;
  const sslAlerts = domains.filter((d) => d.ssl_status && d.ssl_status !== "active").length;
  const latestWhmRun = whmSyncRuns[0];
  const latestRunAccounts = latestWhmRun
    ? whmAccounts.filter((account) => account.sync_run_id === latestWhmRun.id)
    : whmAccounts;
  const visibleWhmAccounts = latestRunAccounts.length > 0 ? latestRunAccounts : whmAccounts;
  const flaggedWhmAccounts = visibleWhmAccounts.filter((account) =>
    ["unmatched", "possible_match", "conflict"].includes(account.match_status)
  );
  const matchCounts = visibleWhmAccounts.reduce<Record<string, number>>(
    (acc, account) => {
      acc[account.match_status] = (acc[account.match_status] || 0) + 1;
      return acc;
    },
    { matched: 0, possible_match: 0, unmatched: 0, conflict: 0 }
  );
  const latestWhmAccounts = visibleWhmAccounts.slice(0, 25);
  const syncRunHistory = whmSyncRuns.slice(0, 6);
  const accountRiskRows = visibleWhmAccounts
    .map((account) => ({ account, ...getAccountRisks(account) }))
    .filter((item) => item.risks.length > 0);
  const diskCounts = visibleWhmAccounts.reduce(
    (acc, account) => {
      const level = classifyUsage(calculateUsagePercent(account.disk_used_mb, account.disk_quota_mb));
      if (level) acc[level] += 1;
      return acc;
    },
    { healthy: 0, warning: 0, critical: 0, over: 0 }
  );
  const bandwidthCounts = visibleWhmAccounts.reduce(
    (acc, account) => {
      const level = classifyUsage(calculateUsagePercent(account.bandwidth_used_mb, account.bandwidth_quota_mb));
      if (level === "warning" || level === "critical" || level === "over") acc[level] += 1;
      return acc;
    },
    { warning: 0, critical: 0, over: 0 }
  );
  const suspendedAccounts = visibleWhmAccounts.filter(isSuspended).length;
  const activeWhmAccounts = visibleWhmAccounts.filter((account) => !isSuspended(account)).length;
  const criticalAlertCount = accountRiskRows.filter((item) =>
    item.risks.some((risk) => ["suspended", "over", "critical"].includes(risk.level))
  ).length;

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">Hosting</h1>
          <p className="text-sm text-muted-foreground mt-1">Infrastructure overview — accounts, domains & mailboxes.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard title="Hosting Accounts" value={accounts.length} icon={Server} variant="primary" />
          <StatCard title="Active Domains" value={activeDomains} icon={Globe} variant="info" />
          <StatCard title="Active Mailboxes" value={activeMailboxes} icon={Mail} variant="success" />
          <StatCard title="SSL Alerts" value={sslAlerts} icon={ShieldAlert} variant={sslAlerts > 0 ? "warning" : "default"} />
        </div>

        {/* Hosting Monitoring */}
        <section className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-9 gap-3">
            <MonitoringCard title="Active WHM Accounts" value={activeWhmAccounts} tone="healthy" />
            <MonitoringCard title="Disk Healthy" value={diskCounts.healthy} tone="healthy" />
            <MonitoringCard title="Disk Warning" value={diskCounts.warning} tone="warning" />
            <MonitoringCard title="Disk Critical" value={diskCounts.critical} tone="critical" />
            <MonitoringCard title="Disk Over Quota" value={diskCounts.over} tone="over" />
            <MonitoringCard title="Suspended Accounts" value={suspendedAccounts} tone={suspendedAccounts > 0 ? "over" : "healthy"} />
            <MonitoringCard title="Bandwidth Warning" value={bandwidthCounts.warning} tone="warning" />
            <MonitoringCard title="Bandwidth Critical" value={bandwidthCounts.critical} tone="critical" />
            <MonitoringCard title="Bandwidth Over Limit" value={bandwidthCounts.over} tone="over" />
          </div>
        </section>

        {/* WHM Sync Overview */}
        <section className="space-y-3">
          <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_1fr] gap-3">
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="px-4 py-3.5 border-b border-border flex items-center justify-between gap-3">
                <h2 className="text-sm font-heading font-bold text-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" /> WHM Sync Health
                </h2>
                {loadingWhm ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <StatusPill status={latestWhmRun?.status || "none"} colorMap={hostingStatusColors} />}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-border">
                {[
                  ["Last sync", formatDateTime(latestWhmRun?.finished_at || latestWhmRun?.started_at)],
                  ["Accounts seen", formatNumber(latestWhmRun?.accounts_seen)],
                  ["Domains seen", formatNumber(latestWhmRun?.domains_seen)],
                  ["Matched", formatNumber(latestWhmRun?.matched_accounts)],
                  ["Unmatched", formatNumber(latestWhmRun?.unmatched_accounts)],
                  ["Status", latestWhmRun?.status ? latestWhmRun.status.replace(/_/g, " ") : "—"],
                ].map(([label, value]) => (
                  <div key={label} className="bg-card px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatCard title="Matched" value={matchCounts.matched || 0} icon={CheckCircle2} variant="success" />
              <StatCard title="Possible Match" value={matchCounts.possible_match || 0} icon={HelpCircle} variant="info" />
              <StatCard title="Unmatched" value={matchCounts.unmatched || 0} icon={Link2Off} variant="warning" />
              <StatCard title="Conflicts" value={matchCounts.conflict || 0} icon={XCircle} variant={matchCounts.conflict > 0 ? "warning" : "default"} />
            </div>
          </div>
        </section>

        {/* Hosting Alerts */}
        <section className={`bg-card rounded-2xl border shadow-sm overflow-hidden ${criticalAlertCount > 0 ? "border-destructive/30" : "border-border"}`}>
          <div className="px-4 py-3.5 border-b border-border flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-heading font-bold text-foreground">Hosting Alerts</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {criticalAlertCount > 0 ? `${criticalAlertCount} critical alerts require review` : "Suspended, over-limit and quota warnings"}
              </p>
            </div>
            <span className={`text-xs font-medium ${criticalAlertCount > 0 ? "text-destructive" : "text-muted-foreground"}`}>
              {accountRiskRows.length} accounts need attention
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">WHM User</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Primary Domain</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Risk Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Disk</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Bandwidth</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden xl:table-cell">Suspension</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Last Synced</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {accountRiskRows.slice(0, 20).map(({ account, risks, diskPercent, bandwidthPercent }) => (
                  <tr key={account.id} className={getRiskRowClass(account)}>
                    <td className="px-4 py-3.5 font-medium text-foreground">{account.whm_user}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{account.primary_domain || "—"}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {risks.map((risk) => <RiskBadge key={`${account.id}-${risk.label}`} label={risk.label} level={risk.level} />)}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell">{formatPercent(diskPercent)}</td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell">{formatPercent(bandwidthPercent)}</td>
                    <td className="px-4 py-3.5"><StatusPill status={account.status || "unknown"} colorMap={hostingStatusColors} /></td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden xl:table-cell">
                      {isSuspended(account) ? (
                        <div>
                          <div>{getSuspensionReason(account)}</div>
                          <div className="text-xs">{getSuspensionDate(account)}</div>
                        </div>
                      ) : (
                        "â€”"
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{formatDateTime(account.last_synced_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {accountRiskRows.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">No hosting risks detected.</p>
          )}
        </section>

        {/* Latest WHM Accounts */}
        <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-4 py-3.5 border-b border-border flex items-center justify-between gap-3">
            <h2 className="text-sm font-heading font-bold text-foreground">Latest WHM Accounts</h2>
            <span className="text-xs text-muted-foreground">{visibleWhmAccounts.length} synced accounts</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">WHM User</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Primary Domain</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Plan</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Disk</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden xl:table-cell">Bandwidth</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Risk</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Match</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Matched Client</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden xl:table-cell">Last Synced</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {latestWhmAccounts.map((account) => {
                  const { risks, diskPercent, bandwidthPercent } = getAccountRisks(account);
                  return (
                    <tr key={account.id} className={getRiskRowClass(account)}>
                      <td className="px-4 py-3.5 font-medium text-foreground">{account.whm_user}</td>
                      <td className="px-4 py-3.5 text-muted-foreground">{account.primary_domain || "—"}</td>
                      <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell">{account.plan || "—"}</td>
                      <td className="px-4 py-3.5"><StatusPill status={account.status || "unknown"} colorMap={hostingStatusColors} /></td>
                      <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">
                        <div>{formatUsage(account.disk_used_mb, account.disk_quota_mb)}</div>
                        <div className="text-xs">{formatPercent(diskPercent)}</div>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground hidden xl:table-cell">
                        <div>{formatUsage(account.bandwidth_used_mb, account.bandwidth_quota_mb)}</div>
                        <div className="text-xs">{formatPercent(bandwidthPercent)}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        {risks.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {risks.map((risk) => <RiskBadge key={`${account.id}-latest-${risk.label}`} label={risk.label} level={risk.level} />)}
                          </div>
                        ) : (
                          <RiskBadge label="Healthy" level="healthy" />
                        )}
                      </td>
                      <td className="px-4 py-3.5"><StatusPill status={account.match_status} colorMap={matchStatusColors} /></td>
                      <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{account.matched_client_id ? clientMap[account.matched_client_id] || "Matched client" : "—"}</td>
                      <td className="px-4 py-3.5 text-muted-foreground hidden xl:table-cell">{formatDateTime(account.last_synced_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {latestWhmAccounts.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">No WHM sync data yet.</p>
          )}
        </section>

        {/* WHM Match Review */}
        <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-4 py-3.5 border-b border-border">
            <h2 className="text-sm font-heading font-bold text-foreground">Unmatched & Review Needed</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">WHM User</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Domain</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Match Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Confidence</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Last Synced</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {flaggedWhmAccounts.slice(0, 20).map((account) => (
                  <tr key={account.id} className="bg-warning/5">
                    <td className="px-4 py-3.5 font-medium text-foreground">{account.whm_user}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{account.primary_domain || "—"}</td>
                    <td className="px-4 py-3.5"><StatusPill status={account.match_status} colorMap={matchStatusColors} /></td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell">{account.match_confidence == null ? "—" : `${Math.round(account.match_confidence * 100)}%`}</td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{formatDateTime(account.last_synced_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {flaggedWhmAccounts.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">No WHM account matches need review.</p>
          )}
        </section>

        {/* Sync Run History */}
        <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-4 py-3.5 border-b border-border">
            <h2 className="text-sm font-heading font-bold text-foreground">WHM Sync Run History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Started</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Finished</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Accounts</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Domains</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Matched</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Unmatched</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden xl:table-cell">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {syncRunHistory.map((run) => (
                  <tr key={run.id} className={run.status === "failed" ? "bg-destructive/5" : "hover:bg-muted/20 transition-colors"}>
                    <td className="px-4 py-3.5 text-muted-foreground">{formatDateTime(run.started_at)}</td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell">{formatDateTime(run.finished_at)}</td>
                    <td className="px-4 py-3.5"><StatusPill status={run.status} colorMap={hostingStatusColors} /></td>
                    <td className="px-4 py-3.5 text-muted-foreground">{formatNumber(run.accounts_seen)}</td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell">{formatNumber(run.domains_seen)}</td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{formatNumber(run.matched_accounts)}</td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{formatNumber(run.unmatched_accounts)}</td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden xl:table-cell">{run.error_summary || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {syncRunHistory.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">No WHM sync runs yet.</p>
          )}
        </section>

        {/* Hosting Accounts */}
        <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-4 py-3.5 border-b border-border">
            <h2 className="text-sm font-heading font-bold text-foreground">Hosting Accounts</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Client</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">cPanel User</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Server</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">IP Address</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {accounts.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-foreground">{clientMap[a.client_id] || "—"}</td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell">{a.cpanel_username || "—"}</td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell">{a.server || "—"}</td>
                    <td className="px-4 py-3.5"><StatusPill status={a.status} colorMap={hostingStatusColors} /></td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{a.ip_address || "—"}</td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{new Date(a.created_at).toLocaleDateString("en-ZA")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {accounts.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">No hosting accounts yet.</p>
          )}
        </section>

        {/* Domains */}
        <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-4 py-3.5 border-b border-border">
            <h2 className="text-sm font-heading font-bold text-foreground">Domains</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Domain</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Client</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">SSL</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Domain Expiry</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">SSL Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {domains.map((d) => {
                  const expiryDate = d.domain_expiry ? new Date(d.domain_expiry) : null;
                  const expiringSoon = expiryDate && expiryDate <= thirtyDaysFromNow && expiryDate >= now;
                  return (
                    <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3.5 font-medium text-foreground flex items-center gap-2">
                        {d.domain_name}
                        {expiringSoon && <span title="Expiring within 30 days"><AlertTriangle className="h-3.5 w-3.5 text-warning" /></span>}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell">{clientMap[d.client_id] || "—"}</td>
                      <td className="px-4 py-3.5"><StatusBadge status={d.status} /></td>
                      <td className="px-4 py-3.5"><StatusPill status={d.ssl_status || "none"} colorMap={sslStatusColors} /></td>
                      <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell">{d.domain_expiry ? new Date(d.domain_expiry).toLocaleDateString("en-ZA") : "—"}</td>
                      <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{d.ssl_expiry ? new Date(d.ssl_expiry).toLocaleDateString("en-ZA") : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {domains.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">No domains yet.</p>
          )}
        </section>

        {/* Mailboxes */}
        <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-4 py-3.5 border-b border-border">
            <h2 className="text-sm font-heading font-bold text-foreground">Mailboxes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Client</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Notes</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mailboxes.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-foreground">{m.email_address}</td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell">{clientMap[m.client_id] || "—"}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={m.status} /></td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell">{m.notes || "—"}</td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{new Date(m.created_at).toLocaleDateString("en-ZA")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {mailboxes.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">No mailboxes yet.</p>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
};

export default Hosting;
