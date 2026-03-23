import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { mockSupportTickets } from "@/data/mockData";

const ClientSupport = () => {
  const { user } = useAuth();
  const tickets = mockSupportTickets.filter((t) => t.clientId === user?.clientId);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground">Support</h1>
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Subject</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Priority</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium text-foreground">{t.subject}</td>
                    <td className="px-4 py-3 hidden sm:table-cell"><StatusBadge status={t.priority} /></td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{t.createdAt}</td>
                    <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tickets.length === 0 && <p className="px-4 py-12 text-sm text-muted-foreground text-center">No support tickets.</p>}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ClientSupport;
