import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { mockReports } from "@/data/mockData";

const ClientReports = () => {
  const { user } = useAuth();
  const reports = mockReports.filter((r) => r.clientId === user?.clientId);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">Reports</h1>
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Report</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-foreground">{r.title}</td>
                    <td className="px-4 py-3.5 hidden sm:table-cell"><StatusBadge status={r.type} /></td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell">{r.date}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {reports.length === 0 && <p className="px-4 py-12 text-sm text-muted-foreground text-center">No reports yet.</p>}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ClientReports;
