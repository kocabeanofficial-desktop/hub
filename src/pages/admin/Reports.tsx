import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useReports, useClients } from "@/hooks/useSupabaseData";

const Reports = () => {
  const { data: reports = [], isLoading } = useReports();
  const { data: clients = [] } = useClients();

  const getClientName = (clientId: string | null) => {
    if (!clientId) return "—";
    return clients.find((c) => c.id === clientId)?.business_name || "—";
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">View and manage all client reports.</p>
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Report</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Client</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-foreground">{r.title || "Untitled"}</p>
                      <p className="text-xs text-muted-foreground sm:hidden mt-0.5">{getClientName(r.client_id)}</p>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell">{getClientName(r.client_id)}</td>
                    <td className="px-4 py-3.5 hidden md:table-cell"><StatusBadge status={r.report_type} /></td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{new Date(r.created_at).toLocaleDateString("en-ZA")}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isLoading && <div className="px-4 py-12 text-center text-sm text-muted-foreground">Loading...</div>}
          {!isLoading && reports.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">No reports yet.</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
