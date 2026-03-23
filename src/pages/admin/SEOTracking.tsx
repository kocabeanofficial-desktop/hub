import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { mockSEOTasks } from "@/data/mockData";

const SEOTracking = () => (
  <DashboardLayout>
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground">SEO & Website Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Track SEO tasks and website management activities.</p>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Task</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Client</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Category</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Due Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mockSEOTasks.map((task) => (
                <tr key={task.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{task.task}</p>
                    <p className="text-xs text-muted-foreground sm:hidden">{task.clientName}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{task.clientName}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{task.category}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{task.dueDate}</td>
                  <td className="px-4 py-3"><StatusBadge status={task.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </DashboardLayout>
);

export default SEOTracking;
