import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useClients, useProjects, useTasks, useReports, useContacts } from "@/hooks/useSupabaseData";
import { callInviteFunction } from "@/lib/inviteFunction";
import { useState, useEffect, useMemo } from "react";
import { Search, ArrowRight, Plus, Pencil, AlertCircle, Loader2, Send, BarChart3, ArrowUpDown, X } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DbClient } from "@/types/database";
import { ClientServicesSection } from "@/components/clients/ClientServicesSection";
import { ClientHostingSection } from "@/components/clients/ClientHostingSection";

type ClientFormData = {
  business_name: string;
  status: string;
  email: string;
  phone: string;
  website_url: string;
  notes: string;
};

const emptyForm: ClientFormData = {
  business_name: "",
  status: "active",
  email: "",
  phone: "",
  website_url: "",
  notes: "",
};

const STATUS_OPTIONS: { value: string; label: string; dot: string }[] = [
  { value: "active", label: "Active", dot: "bg-success" },
  { value: "inactive", label: "Inactive", dot: "bg-muted-foreground" },
  { value: "at_risk", label: "At Risk", dot: "bg-warning" },
  { value: "suspended", label: "Suspended", dot: "bg-destructive" },
  { value: "churned", label: "Churned", dot: "bg-border" },
  { value: "returning", label: "Returning", dot: "bg-info" },
];

type SortOption = "name-asc" | "name-desc" | "newest" | "oldest" | "business-asc";

const Clients = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const urlSearch = searchParams.get("search") || "";
  const urlStatus = (searchParams.get("status") as "all" | "active" | "inactive") || "all";
  const urlSort = (searchParams.get("sort") as SortOption) || "name-asc";

  const [searchInput, setSearchInput] = useState(urlSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(urlSearch);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(urlStatus);
  const [sortBy, setSortBy] = useState<SortOption>(urlSort);

  const [selected, setSelected] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<DbClient | null>(null);
  const [form, setForm] = useState<ClientFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [sendingInvite, setSendingInvite] = useState<string | null>(null);

  const { data: clients = [], isLoading, isError, error } = useClients();
  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks();
  const { data: reports = [] } = useReports();
  const { data: contacts = [] } = useContacts();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Debounce search input (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Sync filters → URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (sortBy !== "name-asc") params.set("sort", sortBy);
    setSearchParams(params, { replace: true });
  }, [debouncedSearch, statusFilter, sortBy, setSearchParams]);

  const contactByClient = useMemo(() => {
    const map = new Map<string, string>();
    contacts.forEach((c) => {
      if (c.is_primary && c.full_name) map.set(c.client_id, c.full_name);
    });
    return map;
  }, [contacts]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    let list = clients.filter((c) => {
      if (statusFilter === "active" && c.status !== "active") return false;
      if (statusFilter === "inactive" && c.status === "active") return false;
      if (!q) return true;
      const fullName = (contactByClient.get(c.id) || "").toLowerCase();
      return (
        c.business_name.toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        fullName.includes(q)
      );
    });

    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
        case "business-asc":
          return a.business_name.localeCompare(b.business_name);
        case "name-desc":
          return b.business_name.localeCompare(a.business_name);
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default:
          return 0;
      }
    });
    return list;
  }, [clients, debouncedSearch, statusFilter, sortBy, contactByClient]);

  const isFilterActive = !!debouncedSearch || statusFilter !== "all" || sortBy !== "name-asc";
  const activeFilterCount =
    (debouncedSearch ? 1 : 0) + (statusFilter !== "all" ? 1 : 0) + (sortBy !== "name-asc" ? 1 : 0);

  const clearFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setStatusFilter("all");
    setSortBy("name-asc");
  };

  const openCreate = () => {
    setEditingClient(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (client: DbClient) => {
    setEditingClient(client);
    setForm({
      business_name: client.business_name || "",
      status: client.status || "active",
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
    if (!form.status) {
      toast({ title: "Validation error", description: "Status is required.", variant: "destructive" });
      return;
    }
    setSaving(true);

    const payload = {
      business_name: form.business_name.trim(),
      status: form.status,
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

    const statusLabel = STATUS_OPTIONS.find((s) => s.value === form.status)?.label || form.status;
    toast({
      title: editingClient ? "Client updated" : "Client created",
      description: editingClient ? `Client status updated to ${statusLabel}` : undefined,
    });
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    setDialogOpen(false);
  };

  const updateField = (field: keyof ClientFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSendInvite = async (client: DbClient) => {
    if (!client.email) {
      toast({ title: "No email", description: "This client has no email address.", variant: "destructive" });
      return;
    }
    setSendingInvite(client.id);
    try {
      // Pass the admin's external-Supabase access token so the edge function can verify
      // the caller is an active super_admin before issuing/resetting credentials.
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        toast({ title: "Not signed in", description: "Please sign in again to send invites.", variant: "destructive" });
        setSendingInvite(null);
        return;
      }
      const { data, error: fnError } = await callInviteFunction(
        {
          client_id: client.id,
          client_email: client.email,
          client_name: client.business_name,
          // Edge function now derives invited_by from the verified admin token
          // (external project), so no client-side id is needed.
          action: "send",
        },
        accessToken,
      );
      if (fnError || (data && data.error)) {
        const reason = data?.reason ? ` (${data.reason})` : "";
        const description =
          (data?.error ? data.error + reason : null) ||
          fnError?.message ||
          "Invite failed — no details returned";
        toast({ title: "Invite failed", description, variant: "destructive" });
      } else {
        toast({ title: "Invite sent", description: `Invite sent to ${client.email}` });
      }
    } catch {
      toast({ title: "Invite failed", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setSendingInvite(null);
    }
  };

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

            {/* Services section */}
            <div className="lg:col-span-2">
              <ClientServicesSection clientId={selected!} />
            </div>

            {/* Hosting & Infrastructure section */}
            <div className="lg:col-span-2">
              <ClientHostingSection clientId={selected!} />
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

        {/* Filter bar */}
        <div className="bg-muted/30 border border-border rounded-2xl p-3 sm:p-4 space-y-3 sm:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, email…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>

            {/* Status + Sort row */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
                <BarChart3 className="h-4 w-4 text-muted-foreground hidden sm:block" />
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                  <SelectTrigger className="w-full sm:w-[150px] h-10 rounded-xl bg-card text-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="inactive">Inactive Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="w-full sm:w-[170px] h-10 rounded-xl bg-card text-sm">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">Name (A–Z)</SelectItem>
                    <SelectItem value="name-desc">Name (Z–A)</SelectItem>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="business-asc">Business Name (A–Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Clear filters */}
            {isFilterActive && (
              <div className="flex items-center gap-2 sm:ml-auto">
                <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-full">
                  {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active
                </span>
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1.5 text-xs">
                  <X className="h-3.5 w-3.5" /> Clear
                </Button>
              </div>
            )}
          </div>

          {isFilterActive && (
            <p className="text-xs text-muted-foreground pt-1">
              {filtered.length} result{filtered.length === 1 ? "" : "s"}
              {clients.length > 0 && <> of {clients.length}</>}
            </p>
          )}
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
                    <td className="px-4 py-3.5">
                      <Link to={`/admin/clients/${client.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                        {client.business_name}
                      </Link>
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
                      <div className="flex items-center gap-1">
                        <Link
                          to={`/admin/clients/${client.id}`}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                        >
                          View
                        </Link>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSendInvite(client); }}
                          disabled={sendingInvite === client.id || !client.email}
                          className="p-1.5 rounded-lg hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                          title={client.email ? "Send Invite" : "No email"}
                        >
                          {sendingInvite === client.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); openEdit(client); }}
                          className="p-1.5 rounded-lg hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
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
        <div className="grid gap-1.5">
          <Label htmlFor="status">Status *</Label>
          <Select value={form.status} onValueChange={(v) => updateField("status", v)}>
            <SelectTrigger id="status">
              <SelectValue placeholder="Select status">
                {form.status && (
                  <span className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${STATUS_OPTIONS.find((s) => s.value === form.status)?.dot || "bg-muted"}`} />
                    {STATUS_OPTIONS.find((s) => s.value === form.status)?.label || form.status}
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${opt.dot}`} />
                    {opt.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
