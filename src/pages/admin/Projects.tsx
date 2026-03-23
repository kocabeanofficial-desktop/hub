import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { WebsiteBuildProgress } from "@/components/dashboard/WebsiteBuildProgress";
import { useProjects, useClients } from "@/hooks/useSupabaseData";
import { useParams, Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { WebsiteBuildStage } from "@/data/mockData";

const Projects = () => {
  const { projectId } = useParams();
  const { data: projects = [], isLoading } = useProjects();
  const { data: clients = [] } = useClients();

  const getClientName = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    return client?.business_name || "—";
  };

  const project = projectId ? projects.find((p) => p.id === projectId) : null;

  if (project) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Link to="/admin/projects" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">← Back to Projects</Link>

          <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-heading font-extrabold text-foreground">{project.project_name || "Untitled"}</h1>
                <p className="text-sm text-muted-foreground">{getClientName(project.client_id)}</p>
              </div>
              <div className="flex gap-2">
                <StatusBadge status={project.stage} />
                <StatusBadge status={project.priority} />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3">{project.description || "No description."}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-sm">
              <div><span className="text-muted-foreground">Type:</span> <span className="font-medium text-foreground">{project.project_type}</span></div>
              {project.due_date && <div><span className="text-muted-foreground">Due:</span> <span className="font-medium text-foreground">{new Date(project.due_date).toLocaleDateString("en-ZA")}</span></div>}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
              <WebsiteBuildProgress currentStage={project.stage as WebsiteBuildStage} />
            </div>
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
              <h3 className="text-sm font-heading font-bold text-foreground mb-3">Notes</h3>
              <p className="text-sm text-muted-foreground">{project.internal_notes || "No notes yet."}</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">Track all client projects and build progress.</p>
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Project</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Client</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Stage</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Priority</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-foreground">{p.project_name || "Untitled"}</p>
                      <p className="text-xs text-muted-foreground sm:hidden mt-0.5">{getClientName(p.client_id)}</p>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell">{getClientName(p.client_id)}</td>
                    <td className="px-4 py-3.5 hidden md:table-cell"><StatusBadge status={p.stage} /></td>
                    <td className="px-4 py-3.5"><StatusBadge status={p.priority} /></td>
                    <td className="px-4 py-3.5">
                      <Link to={`/admin/projects/${p.id}`} className="text-primary hover:text-primary/80 transition-colors">
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isLoading && <div className="px-4 py-12 text-center text-sm text-muted-foreground">Loading...</div>}
          {!isLoading && projects.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">No projects yet.</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Projects;
