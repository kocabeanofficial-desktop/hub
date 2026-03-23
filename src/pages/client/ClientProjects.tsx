import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { WebsiteBuildProgress } from "@/components/dashboard/WebsiteBuildProgress";
import { useAuth } from "@/contexts/AuthContext";
import { mockProjects } from "@/data/mockData";
import { useState } from "react";

const ClientProjects = () => {
  const { user } = useAuth();
  const projects = mockProjects.filter((p) => p.clientId === user?.clientId);
  const [selected, setSelected] = useState<string | null>(null);
  const project = selected ? projects.find((p) => p.id === selected) : null;

  if (project) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <button onClick={() => setSelected(null)} className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">← Back</button>
          <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm">
            <h1 className="text-xl font-heading font-extrabold text-foreground">{project.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
            <div className="flex gap-2 mt-3">
              <StatusBadge status={project.status} />
              <StatusBadge status={project.buildStage} />
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <WebsiteBuildProgress currentStage={project.buildStage} />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">Your Projects</h1>
        <div className="space-y-3">
          {projects.map((p) => (
            <div key={p.id} onClick={() => setSelected(p.id)} className="bg-card rounded-2xl border border-border p-4 sm:p-5 cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">{p.name}</h3>
                <StatusBadge status={p.buildStage} />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">{p.description.slice(0, 80)}...</p>
            </div>
          ))}
          {projects.length === 0 && <p className="text-sm text-muted-foreground">No projects yet.</p>}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ClientProjects;
