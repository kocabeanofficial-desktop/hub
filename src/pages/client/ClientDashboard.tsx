import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { mockProjects, mockSupportTickets, mockReports } from "@/data/mockData";
import { FolderOpen, MessageSquare, FileText, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

const ClientDashboard = () => {
  const { user } = useAuth();
  const clientId = user?.clientId;

  const projects = mockProjects.filter((p) => p.clientId === clientId);
  const tickets = mockSupportTickets.filter((t) => t.clientId === clientId);
  const reports = mockReports.filter((r) => r.clientId === clientId);
  const activeProjects = projects.filter((p) => p.status === "active").length;
  const openTickets = tickets.filter((t) => t.status === "open" || t.status === "in_progress").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome */}
        <div className="rounded-2xl p-5 sm:p-6 gradient-brand text-primary-foreground shadow-md shadow-primary/15">
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold">
            Welcome, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-sm mt-1 text-primary-foreground/80">
            Here's what's happening with your projects.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard title="Active Projects" value={activeProjects} icon={FolderOpen} variant="primary" />
          <StatCard title="Open Support" value={openTickets} icon={MessageSquare} variant="warning" />
          <StatCard title="Reports" value={reports.length} icon={FileText} variant="info" />
          <StatCard title="Action Required" value={tickets.filter((t) => t.priority === "urgent" || t.priority === "high").length} icon={AlertCircle} variant="warning" />
        </div>

        {/* Projects */}
        <div className="bg-card rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-border">
            <h2 className="text-sm font-heading font-bold text-foreground">Your Projects</h2>
            <Link to="/client/projects" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">View all →</Link>
          </div>
          <div className="divide-y divide-border">
            {projects.map((p) => (
              <div key={p.id} className="px-4 sm:px-5 py-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div>
                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.description.slice(0, 60)}...</p>
                </div>
                <StatusBadge status={p.buildStage} />
              </div>
            ))}
            {projects.length === 0 && <p className="px-4 py-6 text-sm text-muted-foreground text-center">No projects yet.</p>}
          </div>
        </div>

        {/* Support + Reports */}
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-card rounded-2xl border border-border shadow-sm">
            <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-border">
              <h2 className="text-sm font-heading font-bold text-foreground">Support</h2>
              <Link to="/client/support" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">View all →</Link>
            </div>
            <div className="divide-y divide-border">
              {tickets.slice(0, 3).map((t) => (
                <div key={t.id} className="px-4 sm:px-5 py-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <p className="text-sm text-foreground">{t.subject}</p>
                  <StatusBadge status={t.status} />
                </div>
              ))}
              {tickets.length === 0 && <p className="px-4 py-6 text-sm text-muted-foreground text-center">No tickets</p>}
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border shadow-sm">
            <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-border">
              <h2 className="text-sm font-heading font-bold text-foreground">Reports</h2>
              <Link to="/client/reports" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">View all →</Link>
            </div>
            <div className="divide-y divide-border">
              {reports.slice(0, 3).map((r) => (
                <div key={r.id} className="px-4 sm:px-5 py-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <p className="text-sm text-foreground">{r.title}</p>
                  <StatusBadge status={r.status} />
                </div>
              ))}
              {reports.length === 0 && <p className="px-4 py-6 text-sm text-muted-foreground text-center">No reports</p>}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ClientDashboard;
