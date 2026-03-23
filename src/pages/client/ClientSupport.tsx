import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useClientTasks } from "@/hooks/useSupabaseData";

const ClientSupport = () => {
  const { user } = useAuth();
  const { data: tasks = [], isLoading } = useClientTasks(user?.clientId);
  const tickets = tasks.filter((t) => t.task_type === "support");

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">Support</h1>
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Subject</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Priority</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-foreground">{t.title}</td>
                    <td className="px-4 py-3.5 hidden sm:table-cell"><StatusBadge status={t.priority} /></td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell">{new Date(t.created_at).toLocaleDateString("en-ZA")}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isLoading && <div className="px-4 py-12 text-center text-sm text-muted-foreground">Loading...</div>}
          {!isLoading && tickets.length === 0 && <p className="px-4 py-12 text-sm text-muted-foreground text-center">No support tickets.</p>}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ClientSupport;
