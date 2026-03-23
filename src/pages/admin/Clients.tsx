import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useClients, useProjects, useTasks, useReports, useContacts } from "@/hooks/useSupabaseData";
import { useState } from "react";
import { Search, ArrowRight, Plus, Pencil, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { ClientFormModal, type ClientFormData } from "@/components/clients/ClientFormModal";

const Clients = () => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useClients();
  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks();
  const { data: reports = [] } = useReports();
  const { data: contacts = [] } = useContacts();

  const filtered = clients.filter((c) =>
    c.business_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.trading_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const selectedClient = selected ? clients.find((c) => c.id === selected) : null;
  const clientProjects = selected ? projects.filter((p) => p.client_id === selected) : [];
  const clientTickets = selected ? tasks.filter((t) => t.client_id === selected && t.task_type === "support") : [];
  const clientReports = selected ? reports.filter((r) => r.client_id === selected) : [];
  const clientContact = selected ? contacts.find((c) => c.client_id === selected && c.is_primary) : null;

  const handleAdd = () => {
    setEditingClient(null);
    setModalOpen(true);
  };

  const handleEdit = (e: React.MouseEvent, client: any) => {
    e.stopPropagation();
    setEditingClient(client);
    setModalOpen(true);
  };

  const handleSubmit = async (data: ClientFormData) => {
    setSaving(true);
    try {
      const payload = {
        business_name: data.business_name.trim(),
        trading_name: data.trading_name.trim() || null,
        company_registration: data.company_registration.trim() || null,
        vat_number: data.vat_number.trim() || null,
        industry: data.industry.trim() || null,
        website_url: data.website_url.trim() || null,
        notes: data.notes.trim() || null,
        status: data.status,
      };

      if (editingClient) {
        const { error } = await supabase
          .from("clients")
          .update(payload)
          .eq("id", editingClient.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("clients")
          .insert(payload);
        if (error) throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ["clients"] });
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  // Client detail view
  if (selectedClient) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <button onClick={() => setSelected(null)} className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">← Back to Clients</button>
          <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-heading font-extrabold text-foreground">{selectedClient.business_name}</h1>
                <p className="text-sm text-muted-foreground">
                  {selectedClient.trading_name ? `t/a ${selectedClient.trading_name} · ` : ""}
                  {clientContact?.full_name || "—"} · {selectedClient.industry || "—"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedClient.status} />
                <button
                  onClick={(e) => handleEdit(e, selectedClient)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-input text-xs font-medium text-foreground hover:bg-muted/40 transition"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-sm">
              <div><span className="text-muted-foreground">Email:</span> <span className="font-medium text-foreground">{selectedClient.email || "—"}</span></div>
              <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium text-foreground">{selectedClient.phone || "—"}</span></div>
              <div><span className="text-muted-foreground">Since:</span> <span className="font-medium text-foreground">{new Date(selectedClient.created_at).toLocaleDateString("en-ZA")}</span></div>
              <div><span className="text-muted-foreground">Registration:</span> <span className="font-medium text-foreground">{selectedClient.company_registration || "—"}</span></div>
              <div><span className="text-muted-foreground">VAT:</span> <span className="font-medium text-foreground">{selectedClient.vat_number || "—"}</span></div>
              <div>
                <span className="text-muted-foreground">Website:</span>{" "}
                {selectedClient.website_url ? (
                  <a href={selectedClient.website_url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline inline-flex items-center gap-1">
                    {selectedClient.website_url.replace(/^https?:\/\//, "")} <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="font-medium text-foreground">—</span>
                )}
              </div>
            </div>
            {selectedClient.notes && (
              <div className="mt-4 text-sm">
                <span className="text-muted-foreground">Notes:</span>
                <p className="mt-1 text-foreground bg-muted/30 rounded-xl px-3 py-2">{selectedClient.notes}</p>
              </div>
            )}
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

        <ClientFormModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
          initialData={editingClient}
          loading={saving}
        />
      </DashboardLayout>
    );
  }

  // Client list view
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">Clients</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your client base.</p>
          </div>
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-brand text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity shadow-md shadow-primary/20"
          >
            <Plus className="h-4 w-4" />
            Add Client
          </button>
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

        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Client</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Industry</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Website</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Created</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((client) => (
                  <tr key={client.id} onClick={() => setSelected(client.id)} className="hover:bg-muted/20 transition-colors cursor-pointer">
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-foreground">{client.business_name}</p>
                      {client.trading_name && <p className="text-xs text-muted-foreground mt-0.5">{client.trading_name}</p>}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell">{client.industry || "—"}</td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell">
                      {client.website_url ? (
                        <span className="text-primary">{client.website_url.replace(/^https?:\/\//, "").slice(0, 30)}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3.5"><StatusBadge status={client.status} /></td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{new Date(client.created_at).toLocaleDateString("en-ZA")}</td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={(e) => handleEdit(e, client)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit client"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isLoading && <div className="px-4 py-12 text-center text-sm text-muted-foreground">Loading...</div>}
          {!isLoading && filtered.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">No clients found.</div>
          )}
        </div>
      </div>

      <ClientFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingClient}
        loading={saving}
      />
    </DashboardLayout>
  );
};

export default Clients;
