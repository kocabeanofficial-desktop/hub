import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import {
  Inbox, Users, FolderOpen, Globe, MessageSquare, FileText, Activity,
} from "lucide-react";
import { mockEnquiries, mockClients, mockProjects, mockSupportTickets, mockReports, mockActivityEvents } from "@/data/mockData";
import { Link } from "react-router-dom";

const AdminDashboard = () => {
  const openEnquiries = mockEnquiries.filter((e) => e.status === "new" || e.status === "contacted").length;
  const activeClients = mockClients.filter((c) => c.status === "active").length;
  const activeProjects = mockProjects.filter((p) => p.status === "active").length;
  const websitesInProgress = mockProjects.filter((p) => p.status === "active" && p.buildStage !== "live").length;
  const openSupport = mockSupportTickets.filter((t) => t.status === "open" || t.status === "in_progress").length;
  const pendingReports = mockReports.filter((r) => r.status === "draft").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back. Here's your overview.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard title="Open Enquiries" value={openEnquiries} icon={Inbox} variant="warning" />
          <StatCard title="Active Clients" value={activeClients} icon={Users} variant="success" />
          <StatCard title="Active Projects" value={activeProjects} icon={FolderOpen} variant="primary" />
          <StatCard title="Sites In Progress" value={websitesInProgress} icon={Globe} variant="info" />
          <StatCard title="Open Support" value={openSupport} icon={MessageSquare} variant="warning" />
          <StatCard title="Reports Pending" value={pendingReports} icon={FileText} variant="default" />
        </div>

        {/* Recent Activity */}
        <div className="bg-card rounded-lg border border-border">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-border">
            <h2 className="text-sm font-heading font-semibold text-foreground">Recent Activity</h2>
            <Link to="/admin/activity" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-border">
            {mockActivityEvents.slice(0, 5).map((event) => (
              <div key={event.id} className="px-4 sm:px-5 py-3 flex items-start gap-3">
                <Activity className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{event.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(event.timestamp).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}
                    {event.clientName && ` · ${event.clientName}`}
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
          <div className="bg-card rounded-lg border border-border">
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-border">
              <h2 className="text-sm font-heading font-semibold text-foreground">Latest Enquiries</h2>
              <Link to="/admin/enquiries" className="text-xs text-primary hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-border">
              {mockEnquiries.slice(0, 3).map((enq) => (
                <div key={enq.id} className="px-4 sm:px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{enq.name}</p>
                    <p className="text-xs text-muted-foreground">{enq.service}</p>
                  </div>
                  <StatusBadge status={enq.status} />
                </div>
              ))}
            </div>
          </div>

          {/* Open Support */}
          <div className="bg-card rounded-lg border border-border">
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-border">
              <h2 className="text-sm font-heading font-semibold text-foreground">Open Support</h2>
              <Link to="/admin/support" className="text-xs text-primary hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-border">
              {mockSupportTickets.filter((t) => t.status !== "closed" && t.status !== "resolved").slice(0, 3).map((ticket) => (
                <div key={ticket.id} className="px-4 sm:px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{ticket.subject}</p>
                    <p className="text-xs text-muted-foreground">{ticket.clientName}</p>
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
