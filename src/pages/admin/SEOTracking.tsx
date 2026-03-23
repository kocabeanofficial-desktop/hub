import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useTasks, useClients } from "@/hooks/useSupabaseData";

const SEOTracking = () => {
  const { data: tasks = [], isLoading } = useTasks();
  const { data: clients = [] } = useClients();
  const seoTasks = tasks.filter((t) => t.task_type === "seo" || t.task_type === "website_management");

  const getClientName = (clientId: string | null) => {
    if (!clientId) return "—";
    return clients.find((c) => c.id === clientId)?.business_name || "—";
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">SEO & Website Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Track SEO tasks and website management activities.</p>
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Task</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Client</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Due Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {seoTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-foreground">{task.title}</p>
                      <p className="text-xs text-muted-foreground sm:hidden mt-0.5">{getClientName(task.client_id)}</p>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell">{getClientName(task.client_id)}</td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell">{task.task_type || "—"}</td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{task.due_date ? new Date(task.due_date).toLocaleDateString("en-ZA") : "—"}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={task.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isLoading && <div className="px-4 py-12 text-center text-sm text-muted-foreground">Loading...</div>}
          {!isLoading && seoTasks.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">No SEO tasks yet.</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SEOTracking;
