import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { mockReports } from "@/data/mockData";

const Reports = () => (
  <DashboardLayout>
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">View and manage all client reports.</p>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Report</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Client</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mockReports.map((r) => (
                <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{r.title}</p>
                    <p className="text-xs text-muted-foreground sm:hidden">{r.clientName}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{r.clientName}</td>
                  <td className="px-4 py-3 hidden md:table-cell"><StatusBadge status={r.type} /></td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{r.date}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </DashboardLayout>
);

export default Reports;
