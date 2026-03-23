import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { mockSupportTickets } from "@/data/mockData";

const Support = () => (
  <DashboardLayout>
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">Support Tickets</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage client support requests.</p>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Subject</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Client</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Priority</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mockSupportTickets.map((t) => (
                <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-foreground">{t.subject}</p>
                    <p className="text-xs text-muted-foreground sm:hidden mt-0.5">{t.clientName}</p>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell">{t.clientName}</td>
                  <td className="px-4 py-3.5 hidden md:table-cell"><StatusBadge status={t.priority} /></td>
                  <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{t.createdAt}</td>
                  <td className="px-4 py-3.5"><StatusBadge status={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </DashboardLayout>
);

export default Support;
