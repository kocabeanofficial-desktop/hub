import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTasks, useClients, useProjects } from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Loader2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { DbTask } from "@/types/database";

const priorityColor: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  normal: "bg-primary/10 text-primary border-primary/20",
  low: "bg-muted text-muted-foreground border-border",
};

const TaskManager = () => {
  const { data: tasks = [], isLoading } = useTasks();
  const { data: clients = [] } = useClients();
  const { data: projects = [] } = useProjects();
  const qc = useQueryClient();

  const [selectedTask, setSelectedTask] = useState<DbTask | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [editDueDate, setEditDueDate] = useState<Date | undefined>();
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Filters
  const [filterClient, setFilterClient] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const getClientName = (id: string | null) =>
    id ? clients.find((c) => c.id === id)?.business_name || "—" : "—";
  const getProjectName = (id: string | null) =>
    id ? projects.find((p) => p.id === id)?.project_name || "—" : "—";

  const filtered = tasks.filter((t) => {
    if (filterClient !== "all" && t.client_id !== filterClient) return false;
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterType !== "all" && t.task_type !== filterType) return false;
    return true;
  });

  const columns = [
    { key: "todo", label: "To Do", items: filtered.filter((t) => t.status === "todo") },
    { key: "in_progress", label: "In Progress", items: filtered.filter((t) => t.status === "in_progress") },
    { key: "completed", label: "Done", items: filtered.filter((t) => t.status === "completed") },
  ];

  const taskTypes = [...new Set(tasks.map((t) => t.task_type).filter(Boolean))];

  const openDetail = (task: DbTask) => {
    setSelectedTask(task);
    setEditStatus(task.status);
    setEditPriority(task.priority);
    setEditDueDate(task.due_date ? new Date(task.due_date) : undefined);
    setEditNotes(task.description || "");
  };

  const handleSave = async () => {
    if (!selectedTask) return;
    setSaving(true);
    const { error } = await supabase.from("tasks").update({
      status: editStatus,
      priority: editPriority,
      due_date: editDueDate ? editDueDate.toISOString() : null,
      description: editNotes || null,
      completed_at: editStatus === "completed" ? new Date().toISOString() : null,
    }).eq("id", selectedTask.id);
    setSaving(false);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Task updated" });
    qc.invalidateQueries({ queryKey: ["tasks"] });
    setSelectedTask(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">Task Manager</h1>
          <p className="text-sm text-muted-foreground mt-1">Track and manage all tasks across clients.</p>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2">
          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger className="w-[180px] h-9 text-xs">
              <Filter className="h-3 w-3 mr-1.5" />
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.business_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Done</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {taskTypes.map((t) => (
                <SelectItem key={t!} value={t!}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="py-12 text-center">
            <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-12 text-center">
            <p className="text-sm text-muted-foreground">No tasks yet — assign a service to a client to auto-generate tasks</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {columns.map((col) => (
              <div key={col.key} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{col.label}</h3>
                  <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">{col.items.length}</span>
                </div>
                <div className="space-y-2 min-h-[100px]">
                  {col.items.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => openDetail(task)}
                      className="w-full text-left bg-card rounded-xl border border-border p-3.5 hover:border-primary/30 hover:shadow-sm transition-all"
                    >
                      <p className="text-sm font-medium text-foreground line-clamp-2">{task.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{getClientName(task.client_id)}</p>
                      {task.project_id && (
                        <p className="text-xs text-muted-foreground">{getProjectName(task.project_id)}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${priorityColor[task.priority] || priorityColor.normal}`}>
                          {task.priority}
                        </span>
                        {task.source === "auto_generated" && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md border bg-accent text-accent-foreground border-border">
                            Auto
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      <Dialog open={!!selectedTask} onOpenChange={(o) => !o && setSelectedTask(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold">{selectedTask?.title}</DialogTitle>
            <DialogDescription>Update task details below.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Priority</Label>
                <Select value={editPriority} onValueChange={setEditPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal">
                    {editDueDate ? editDueDate.toLocaleDateString("en-ZA") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={editDueDate} onSelect={setEditDueDate} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-1.5">
              <Label>Notes</Label>
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTask(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default TaskManager;
