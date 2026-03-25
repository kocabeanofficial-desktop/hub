import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useClients, useProjects, useTasks, useReports, useContacts } from "@/hooks/useSupabaseData";
import { useState } from "react";
import { Search, ArrowRight, Plus, Pencil, AlertCircle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DbClient } from "@/types/database";

type ClientFormData = {
  business_name: string;
  email: string;
  phone: string;
  website_url: string;
  notes: string;
};

const emptyForm: ClientFormData = {
  business_name: "",
  email: "",
  phone: "",
  website_url: "",
  notes: "",
};

const Clients = () => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<DbClient | null>(null);
  const [form, setForm] = useState<ClientFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data: clients = [], isLoading, isError, error } = useClients();
  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks();
  const { data: reports = [] } = useReports();
  const { data: contacts = [] } = useContacts();
  const queryClient = useQueryClient();

  const filtered = clients.filter((c) =>
    c.business_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingClient(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (client: DbClient) => {
    setEditingClient(client);
    setForm({
      business_name: client.business_name || "",
      email: client.email || "",
      phone: client.phone || "",
      website_url: client.website_url || "",
      notes: client.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.business_name.trim()) {
      toast({ title: "Validation error", description: "Name is required.", variant: "destructive" });
      return;
    }
    setSaving(true);

    const payload = {
      business_name: form.business_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      website_url: form.website_url.trim() || null,
      notes: form.notes.trim() || null,
    };

    let result;
    if (editingClient) {
      result = await supabase.from("clients").update(payload).eq("id", editingClient.id);
    } else {
      result = await supabase.from("clients").insert(payload);
    }

    setSaving(false);

    if (result.error) {
      toast({ title: "Save failed", description: result.error.message, variant: "destructive" });
      return;
    }

    toast({ title: editingClient ? "Client updated" : "Client created" });
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    setDialogOpen(false);
  };

  const updateField = (field: keyof ClientFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // ── Detail view ──
  const selectedClient = selected ? clients.find((c) => c.id === selected) : null;
  const clientProjects = selected ? projects.filter((p) => p.client_id === selected) : [];
  const clientTickets = selected ? tasks.filter((t) => t.client_id === selected && t.task_type === "support") : [];
  const clientReports = selected ? reports.filter((r) => r.client_id === selected) : [];
  const clientContact = selected ? contacts.find((c) => c.client_id === selected && c.is_primary) : null;

  if (selectedClient) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button onClick={() => setSelected(null)} className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">← Back to Clients</button>
            <Button variant="outline" size="sm" onClick={() => openEdit(selectedClient)}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
            </Button>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-heading font-extrabold text-foreground">{selectedClient.business_name}</h1>
                <p className="text-sm text-muted-foreground">{clientContact?.full_name || "—"}</p>
              </div>
              <StatusBadge status={selectedClient.status} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-sm">
              <div><span className="text-muted-foreground">Email:</span> <span className="font-medium text-foreground">{selectedClient.email || "—"}</span></div>
              <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium text-foreground">{selectedClient.phone || "—"}</span></div>
              <div><span className="text-muted-foreground">Since:</span> <span className="font-medium text-foreground">{new Date(selectedClient.created_at).toLocaleDateString("en-ZA")}</span></div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-card rounded-2xl border border-border shadow-sm">
              <div className="px-4 py-3.5 border-b border-border"><h3 className="text-sm font-heading font-bold text-foreground">Projects ({clientProjects.length})</h3></div>
              <div className="divide-y divide-border">
                {clientProjects.map((p) => (
                  <Link key={p.id} to={`/admin/projects/${p.id}`} className="px-4 py-3.5 flex items-center justify-between hover:bg-muted/20 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.project_name || "Untitled"}</p>
                      <div className="mt-1"><StatusBadge status={p.stage} /></div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
                {clientProjects.length === 0 && <p className="px-4 py-6 text-sm text-muted-foreground text-center">No projects</p>}
              </div>
            </div>
            <div className="bg-card rounded-2xl border border-border shadow-sm">
              <div className="px-4 py-3.5 border-b border-border"><h3 className="text-sm font-heading font-bold text-foreground">Support ({clientTickets.length})</h3></div>
              <div className="divide-y divide-border">
                {clientTickets.map((t) => (
                  <div key={t.id} className="px-4 py-3.5 flex items-center justify-between hover:bg-muted/20 transition-colors">
                    <p className="text-sm text-foreground">{t.title}</p>
                    <StatusBadge status={t.status} />
                  </div>
                ))}
                {clientTickets.length === 0 && <p className="px-4 py-6 text-sm text-muted-foreground text-center">No tickets</p>}
              </div>
            </div>
            <div className="bg-card rounded-2xl border border-border lg:col-span-2 shadow-sm">
              <div className="px-4 py-3.5 border-b border-border"><h3 className="text-sm font-heading font-bold text-foreground">Reports ({clientReports.length})</h3></div>
              <div className="divide-y divide-border">
                {clientReports.map((r) => (
                  <div key={r.id} className="px-4 py-3.5 flex items-center justify-between hover:bg-muted/20 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-foreground">{r.title || "Untitled"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(r.created_at).toLocaleDateString("en-ZA")}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                ))}
                {clientReports.length === 0 && <p className="px-4 py-6 text-sm text-muted-foreground text-center">No reports</p>}
              </div>
            </div>
          </div>
        </div>

        <ClientFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          form={form}
          updateField={updateField}
          onSave={handleSave}
          saving={saving}
          isEdit={!!editingClient}
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
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">Clients</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your client base.</p>
          </div>
          <Button onClick={openCreate} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Client
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
          />
        </div>

        {isError && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{(error as Error)?.message || "Failed to load clients."}</p>
          </div>
        )}

        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Phone</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Website</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Created</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((client) => (
                  <tr key={client.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3.5 cursor-pointer" onClick={() => setSelected(client.id)}>
                      <p className="font-medium text-foreground">{client.business_name}</p>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell">{client.email || "—"}</td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell">{client.phone || "—"}</td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">
                      {client.website_url ? (
                        <a href={client.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate block max-w-[180px]">{client.website_url.replace(/^https?:\/\//, "")}</a>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{new Date(client.created_at).toLocaleDateString("en-ZA")}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={client.status} /></td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(client); }}
                        className="p-1.5 rounded-lg hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isLoading && (
            <div className="px-4 py-12 text-center">
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground mt-2">Loading clients…</p>
            </div>
          )}
          {!isLoading && !isError && filtered.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">
              {clients.length === 0 ? 'No clients yet. Click "Add Client" to get started.' : "No clients match your search."}
            </div>
          )}
        </div>
      </div>

      <ClientFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        form={form}
        updateField={updateField}
        onSave={handleSave}
        saving={saving}
        isEdit={!!editingClient}
      />
    </DashboardLayout>
  );
};

// ── Form Dialog ──
interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ClientFormData;
  updateField: (field: keyof ClientFormData, value: string) => void;
  onSave: () => void;
  saving: boolean;
  isEdit: boolean;
}

const ClientFormDialog = ({ open, onOpenChange, form, updateField, onSave, saving, isEdit }: ClientFormDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-heading font-bold">{isEdit ? "Edit Client" : "Add Client"}</DialogTitle>
        <DialogDescription>{isEdit ? "Update the client details below." : "Fill in the details to create a new client."}</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-2">
        <div className="grid gap-1.5">
          <Label htmlFor="business_name">Name *</Label>
          <Input id="business_name" value={form.business_name} onChange={(e) => updateField("business_name", e.target.value)} placeholder="e.g. Acme Holdings" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder="hello@example.co.za" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="071 234 5678" />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="website_url">Website</Label>
          <Input id="website_url" value={form.website_url} onChange={(e) => updateField("website_url", e.target.value)} placeholder="https://example.co.za" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="notes">Notes</Label>
          <textarea
            id="notes"
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
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
          {isEdit ? "Save Changes" : "Create Client"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default Clients;
