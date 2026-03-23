import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import {
  Inbox, Users, FolderOpen, Globe, MessageSquare, FileText, Activity,
} from "lucide-react";
import { useClients, useProjects, useIntakeSubmissions, useReports, useAutomationEvents, useTasks } from "@/hooks/useSupabaseData";
import { Link } from "react-router-dom";

const AdminDashboard = () => {
  const { data: enquiries = [] } = useIntakeSubmissions();
  const { data: clients = [] } = useClients();
  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks();
  const { data: reports = [] } = useReports();
  const { data: activityEvents = [] } = useAutomationEvents();

  const openEnquiries = enquiries.filter((e) => e.status === "new" || e.status === "contacted").length;
  const activeClients = clients.filter((c) => c.status === "active").length;
  const activeProjects = projects.filter((p) => p.stage !== "completed" && p.stage !== "cancelled").length;
  const websitesInProgress = projects.filter((p) => p.project_type === "website" && p.stage !== "live" && p.stage !== "completed").length;
  const openSupport = tasks.filter((t) => t.task_type === "support" && (t.status === "todo" || t.status === "in_progress")).length;
  const pendingReports = reports.filter((r) => r.status === "draft").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back. Here's your overview.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <StatCard title="Open Enquiries" value={openEnquiries} icon={Inbox} variant="warning" />
          <StatCard title="Active Clients" value={activeClients} icon={Users} variant="success" />
          <StatCard title="Active Projects" value={activeProjects} icon={FolderOpen} variant="primary" />
          <StatCard title="Sites In Progress" value={websitesInProgress} icon={Globe} variant="info" />
          <StatCard title="Open Support" value={openSupport} icon={MessageSquare} variant="warning" />
          <StatCard title="Reports Pending" value={pendingReports} icon={FileText} variant="default" />
        </div>

        {/* Recent Activity */}
        <div className="bg-card rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-border">
            <h2 className="text-sm font-heading font-bold text-foreground">Recent Activity</h2>
            <Link to="/admin/activity" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">View all →</Link>
          </div>
          <div className="divide-y divide-border">
            {activityEvents.length === 0 && (
              <p className="px-4 py-8 text-sm text-muted-foreground text-center">No activity yet.</p>
            )}
            {activityEvents.slice(0, 5).map((event) => (
              <div key={event.id} className="px-4 sm:px-5 py-3.5 flex items-start gap-3 hover:bg-muted/30 transition-colors">
                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center mt-0.5">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{event.message || event.event_type}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(event.created_at).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <StatusBadge status={event.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Quick lists */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Recent Enquiries */}
          <div className="bg-card rounded-2xl border border-border shadow-sm">
            <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-border">
              <h2 className="text-sm font-heading font-bold text-foreground">Latest Enquiries</h2>
              <Link to="/admin/enquiries" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">View all →</Link>
            </div>
            <div className="divide-y divide-border">
              {enquiries.length === 0 && (
                <p className="px-4 py-6 text-sm text-muted-foreground text-center">No enquiries yet.</p>
              )}
              {enquiries.slice(0, 3).map((enq) => (
                <div key={enq.id} className="px-4 sm:px-5 py-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground">{enq.submitter_name || enq.business_name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{enq.requested_services || enq.source}</p>
                  </div>
                  <StatusBadge status={enq.status} />
                </div>
              ))}
            </div>
          </div>

          {/* Open Support */}
          <div className="bg-card rounded-2xl border border-border shadow-sm">
            <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-border">
              <h2 className="text-sm font-heading font-bold text-foreground">Open Support</h2>
              <Link to="/admin/support" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">View all →</Link>
            </div>
            <div className="divide-y divide-border">
              {tasks.filter((t) => t.task_type === "support" && t.status !== "done").length === 0 && (
                <p className="px-4 py-6 text-sm text-muted-foreground text-center">No open support tickets.</p>
              )}
              {tasks.filter((t) => t.task_type === "support" && t.status !== "done").slice(0, 3).map((ticket) => (
                <div key={ticket.id} className="px-4 sm:px-5 py-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground">{ticket.title}</p>
                  </div>
                  <StatusBadge status={ticket.priority} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
