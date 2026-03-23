import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { WebsiteBuildProgress } from "@/components/dashboard/WebsiteBuildProgress";
import { mockProjects } from "@/data/mockData";
import { useParams, Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const Projects = () => {
  const { projectId } = useParams();
  const project = projectId ? mockProjects.find((p) => p.id === projectId) : null;

  if (project) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Link to="/admin/projects" className="text-sm text-primary hover:underline">← Back to Projects</Link>

          <div className="bg-card rounded-lg border border-border p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-heading font-bold text-foreground">{project.name}</h1>
                <p className="text-sm text-muted-foreground">{project.clientName}</p>
              </div>
              <div className="flex gap-2">
                <StatusBadge status={project.status} />
                <StatusBadge status={project.buildStage} />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3">{project.description}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-sm">
              <div><span className="text-muted-foreground">Start:</span> <span className="text-foreground">{project.startDate}</span></div>
              <div><span className="text-muted-foreground">Target:</span> <span className="text-foreground">{project.targetDate}</span></div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-card rounded-lg border border-border p-5">
              <WebsiteBuildProgress currentStage={project.buildStage} />
            </div>
            <div className="bg-card rounded-lg border border-border p-5">
              <h3 className="text-sm font-heading font-semibold text-foreground mb-3">Notes</h3>
              <p className="text-sm text-muted-foreground">{project.notes || "No notes yet."}</p>
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
          <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">Track all client projects and build progress.</p>
        </div>

        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Project</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Client</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Build Stage</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mockProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground sm:hidden">{p.clientName}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{p.clientName}</td>
                    <td className="px-4 py-3 hidden md:table-cell"><StatusBadge status={p.buildStage} /></td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3">
                      <Link to={`/admin/projects/${p.id}`} className="text-primary hover:text-primary/80">
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Projects;
