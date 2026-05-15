import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import {
  Globe, Package, FileText, MessageSquare, ExternalLink,
  ShieldCheck, Mail, Server, ArrowUpRight, Sparkles, LifeBuoy,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const CLIENT = {
  name: "Smartlook Pharmacy",
  domain: "smartlook.co.za",
  email: "info@smartlook.co.za",
  hosting: "Koca Bean Managed Hosting",
};

const services = [
  { name: "Website Hosting", status: "Active", icon: Server, detail: "cPanel · SSL enabled" },
  { name: "Business Email", status: "Active", icon: Mail, detail: "5 mailboxes" },
  { name: "Domain Management", status: "Active", icon: Globe, detail: "Renews annually" },
  { name: "Maintenance & Support", status: "Active", icon: ShieldCheck, detail: "Monthly retainer" },
];

const reports = [
  { title: "Monthly Website Report", period: "April 2026", type: "Performance" },
  { title: "SEO Snapshot", period: "Q1 2026", type: "SEO" },
  { title: "Hosting Uptime Report", period: "March 2026", type: "Hosting" },
];

const ClientDashboard = () => {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome */}
        <div className="rounded-2xl p-5 sm:p-6 gradient-brand text-primary-foreground shadow-md shadow-primary/15">
          <p className="text-xs uppercase tracking-[0.18em] text-primary-foreground/70">Client Portal</p>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold mt-1">
            Welcome back, {firstName} 👋
          </h1>
          <p className="text-sm mt-1 text-primary-foreground/80">
            Here's everything we're managing for {CLIENT.name}.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Website */}
          <div className="lg:col-span-2 bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your Website</p>
                  <h2 className="text-lg font-heading font-bold text-foreground mt-0.5">{CLIENT.name}</h2>
                  <a
                    href={`https://${CLIENT.domain}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-1"
                  >
                    {CLIENT.domain}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 text-success px-2.5 py-1 text-xs font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-success" /> Online
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5 pt-5 border-t border-border">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Hosting</p>
                <p className="text-sm font-medium text-foreground mt-0.5">{CLIENT.hosting}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">SSL</p>
                <p className="text-sm font-medium text-foreground mt-0.5">Valid · Auto-renew</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Primary Email</p>
                <p className="text-sm font-medium text-foreground mt-0.5 truncate">{CLIENT.email}</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-heading font-bold text-foreground">Quick Actions</h2>
            </div>
            <div className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-between">
                <Link to="/client/support">
                  <span className="flex items-center gap-2"><LifeBuoy className="h-4 w-4" /> Get Support</span>
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-between">
                <Link to="/client/reports">
                  <span className="flex items-center gap-2"><FileText className="h-4 w-4" /> View Reports</span>
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-between">
                <a href={`https://${CLIENT.domain}`} target="_blank" rel="noreferrer">
                  <span className="flex items-center gap-2"><Globe className="h-4 w-4" /> Visit Website</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Services */}
        <div className="bg-card rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-heading font-bold text-foreground">Active Services</h2>
            </div>
            <span className="text-xs text-muted-foreground">{services.length} active</span>
          </div>
          <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
            {services.map((s, i) => (
              <div
                key={s.name}
                className={`px-5 py-4 ${i >= 2 ? "sm:border-t sm:border-border" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-muted p-2 text-foreground">
                    <s.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">{s.name}</p>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-success">{s.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reports */}
        <div className="bg-card rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-heading font-bold text-foreground">Recent Reports</h2>
            </div>
            <Link to="/client/reports" className="text-xs font-medium text-primary hover:text-primary/80">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-border">
            {reports.map((r) => (
              <div key={r.title} className="px-5 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div>
                  <p className="text-sm font-medium text-foreground">{r.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.period} · {r.type}</p>
                </div>
                <Button size="sm" variant="ghost" className="text-primary">
                  Open <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Need help */}
        <div className="rounded-2xl border border-border bg-muted/30 p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Need a hand?</p>
              <p className="text-xs text-muted-foreground">Our team usually replies within a few hours.</p>
            </div>
          </div>
          <Button asChild>
            <Link to="/client/support">Contact Support</Link>
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ClientDashboard;
