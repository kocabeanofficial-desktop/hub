import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useClients, useProjects, useTasks, useReports, useContacts } from "@/hooks/useSupabaseData";
import { useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Clients = () => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
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

  if (selectedClient) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <button onClick={() => setSelected(null)} className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">← Back to Clients</button>
          <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-heading font-extrabold text-foreground">{selectedClient.business_name}</h1>
                <p className="text-sm text-muted-foreground">{clientContact?.full_name || "—"} · {selectedClient.industry || "—"}</p>
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
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your client base.</p>
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
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Contact</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
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
                    <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell">{client.email || "—"}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={client.status} /></td>
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
    </DashboardLayout>
  );
};

export default Clients;
