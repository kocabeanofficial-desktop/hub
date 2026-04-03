import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useHostingAccounts, useDomains, useMailboxes, useClients } from "@/hooks/useSupabaseData";
import { Server, Globe, Mail, ShieldAlert, AlertTriangle, Loader2 } from "lucide-react";
import { useMemo } from "react";

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

const StatusPill = ({ status, colorMap }: { status: string; colorMap: Record<string, string> }) => {
  const style = colorMap[status] || "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      {status.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())}
    </span>
  );
};

const Hosting = () => {
  const { data: accounts = [], isLoading: loadingAccounts } = useHostingAccounts();
  const { data: domains = [], isLoading: loadingDomains } = useDomains();
  const { data: mailboxes = [], isLoading: loadingMailboxes } = useMailboxes();
  const { data: clients = [] } = useClients();

  const clientMap = useMemo(() => {
    const m: Record<string, string> = {};
    clients.forEach((c) => (m[c.id] = c.business_name));
    return m;
  }, [clients]);

  const isLoading = loadingAccounts || loadingDomains || loadingMailboxes;

  const activeDomains = domains.filter((d) => d.status === "active").length;
  const activeMailboxes = mailboxes.filter((m) => m.status === "active").length;
  const sslAlerts = domains.filter((d) => d.ssl_status && d.ssl_status !== "active").length;

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
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Package</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Disk Used</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {accounts.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-foreground">{clientMap[a.client_id] || "—"}</td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell">{a.cpanel_username || "—"}</td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell">{a.package || "—"}</td>
                    <td className="px-4 py-3.5"><StatusPill status={a.status} colorMap={hostingStatusColors} /></td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{a.disk_used || "—"}</td>
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
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Quota Used</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mailboxes.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-foreground">{m.email_address}</td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell">{clientMap[m.client_id] || "—"}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={m.status} /></td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell">{m.quota_used || "—"}</td>
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
