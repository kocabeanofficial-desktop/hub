import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { WebsiteBuildProgress } from "@/components/dashboard/WebsiteBuildProgress";
import { OriginalIntakeBriefSection } from "@/components/enquiries/OriginalIntakeBriefSection";
import { useProjects, useClients } from "@/hooks/useSupabaseData";
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowRight, Plus, Pencil, AlertCircle, Loader2, CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { DbProject } from "@/types/database";
import type { WebsiteBuildStage } from "@/data/mockData";

type ProjectFormData = {
  client_id: string;
  project_name: string;
  project_type: string;
  stage: string;
  priority: string;
  due_date: string;
  internal_notes: string;
};

const emptyForm: ProjectFormData = {
  client_id: "",
  project_name: "",
  project_type: "website",
  stage: "discovery",
  priority: "medium",
  due_date: "",
  internal_notes: "",
};

const PROJECT_TYPES = [
  "smart_website",
  "smart_ecommerce",
  "smart_system",
  "website_build",
  "website_redesign",
  "ecommerce_build",
  "booking_system",
  "custom_web_app",
  "existing_client_support",
  "general_enquiry",
];
const STAGES = ["discovery", "design", "development", "review", "launch", "completed", "on_hold"];
const PRIORITIES = ["low", "medium", "high", "urgent"];

const Projects = () => {
  const { projectId } = useParams();
  const { data: projects = [], isLoading, isError, error } = useProjects();
  const { data: clients = [] } = useClients();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<DbProject | null>(null);
  const [form, setForm] = useState<ProjectFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const getClientName = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    return client?.business_name || "—";
  };

  const openCreate = () => {
    setEditingProject(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (project: DbProject) => {
    setEditingProject(project);
    setForm({
      client_id: project.client_id || "",
      project_name: project.project_name || "",
      project_type: project.project_type || "website",
      stage: project.stage || "discovery",
      priority: project.priority || "medium",
      due_date: project.due_date || "",
      internal_notes: project.internal_notes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.project_name.trim()) {
      toast({ title: "Validation error", description: "Project name is required.", variant: "destructive" });
      return;
    }
    if (!form.client_id) {
      toast({ title: "Validation error", description: "Please select a client.", variant: "destructive" });
      return;
    }
    setSaving(true);

    const payload = {
      client_id: form.client_id,
      project_name: form.project_name.trim(),
      project_type: form.project_type,
      stage: form.stage,
      priority: form.priority,
      due_date: form.due_date || null,
      internal_notes: form.internal_notes.trim() || null,
    };

    let result;
    if (editingProject) {
      result = await supabase.from("projects").update(payload).eq("id", editingProject.id);
    } else {
      result = await supabase.from("projects").insert(payload);
    }

    setSaving(false);

    if (result.error) {
      toast({ title: "Save failed", description: result.error.message, variant: "destructive" });
      return;
    }

    toast({ title: editingProject ? "Project updated" : "Project created" });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    setDialogOpen(false);
  };

  const updateField = (field: keyof ProjectFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // ── Detail view ──
  const project = projectId ? projects.find((p) => p.id === projectId) : null;

  if (project) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Link to="/admin/projects" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">← Back to Projects</Link>
            <Button variant="outline" size="sm" onClick={() => openEdit(project)}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
            </Button>
          </div>

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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-sm">
              <div><span className="text-muted-foreground">Type:</span> <span className="font-medium text-foreground capitalize">{project.project_type?.replace(/_/g, " ")}</span></div>
              {project.due_date && <div><span className="text-muted-foreground">Due:</span> <span className="font-medium text-foreground">{new Date(project.due_date).toLocaleDateString("en-ZA")}</span></div>}
              <div><span className="text-muted-foreground">Created:</span> <span className="font-medium text-foreground">{new Date(project.created_at).toLocaleDateString("en-ZA")}</span></div>
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

          <OriginalIntakeBriefSection projectId={project.id} />
        </div>

        <ProjectFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          form={form}
          updateField={updateField}
          onSave={handleSave}
          saving={saving}
          isEdit={!!editingProject}
          clients={clients}
        />
      </DashboardLayout>
    );
  }

  // ── List view ──
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">Projects</h1>
            <p className="text-sm text-muted-foreground mt-1">Track all client projects and build progress.</p>
          </div>
          <Button onClick={openCreate} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Project
          </Button>
        </div>

        {isError && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{(error as Error)?.message || "Failed to load projects."}</p>
          </div>
        )}

        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Project Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Client</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Stage</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Priority</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Due Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Created</th>
                  <th className="px-4 py-3 w-20"></th>
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
                    <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell capitalize">{p.project_type?.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3.5 hidden md:table-cell"><StatusBadge status={p.stage} /></td>
                    <td className="px-4 py-3.5"><StatusBadge status={p.priority} /></td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{p.due_date ? new Date(p.due_date).toLocaleDateString("en-ZA") : "—"}</td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{new Date(p.created_at).toLocaleDateString("en-ZA")}</td>
                    <td className="px-4 py-3.5 flex items-center gap-1">
                      <button
                        onClick={() => openEdit(p)}
                        className="p-1.5 rounded-lg hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <Link to={`/admin/projects/${p.id}`} className="p-1.5 rounded-lg hover:bg-muted/40 text-primary hover:text-primary/80 transition-colors">
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isLoading && (
            <div className="px-4 py-12 text-center">
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground mt-2">Loading projects…</p>
            </div>
          )}
          {!isLoading && !isError && projects.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">
              No projects yet. Click "Add Project" to get started.
            </div>
          )}
        </div>
      </div>

      <ProjectFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        form={form}
        updateField={updateField}
        onSave={handleSave}
        saving={saving}
        isEdit={!!editingProject}
        clients={clients}
      />
    </DashboardLayout>
  );
};

// ── Form Dialog ──
interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ProjectFormData;
  updateField: (field: keyof ProjectFormData, value: string) => void;
  onSave: () => void;
  saving: boolean;
  isEdit: boolean;
  clients: { id: string; business_name: string }[];
}

const ProjectFormDialog = ({ open, onOpenChange, form, updateField, onSave, saving, isEdit, clients }: ProjectFormDialogProps) => {
  const dueDate = form.due_date ? new Date(form.due_date) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading font-bold">{isEdit ? "Edit Project" : "Add Project"}</DialogTitle>
          <DialogDescription>{isEdit ? "Update the project details below." : "Fill in the details to create a new project."}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="client_id">Client *</Label>
            <Select value={form.client_id} onValueChange={(v) => updateField("client_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.business_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="project_name">Project Name *</Label>
            <Input id="project_name" value={form.project_name} onChange={(e) => updateField("project_name", e.target.value)} placeholder="e.g. Website Redesign" />
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Select value={form.project_type} onValueChange={(v) => updateField("project_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Stage</Label>
              <Select value={form.stage} onValueChange={(v) => updateField("stage", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => updateField("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((pr) => (
                    <SelectItem key={pr} value={pr} className="capitalize">{pr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={(d) => updateField("due_date", d ? d.toISOString().split("T")[0] : "")}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="internal_notes">Notes</Label>
            <textarea
              id="internal_notes"
              value={form.internal_notes}
              onChange={(e) => updateField("internal_notes", e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition resize-none"
              placeholder="Optional notes…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={onSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            {isEdit ? "Save Changes" : "Create Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Projects;
