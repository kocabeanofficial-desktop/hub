import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { mockClients, mockProjects, mockSupportTickets, mockReports } from "@/data/mockData";
import { useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Clients = () => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = mockClients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.contactName.toLowerCase().includes(search.toLowerCase())
  );

  const selectedClient = selected ? mockClients.find((c) => c.id === selected) : null;
  const clientProjects = selected ? mockProjects.filter((p) => p.clientId === selected) : [];
  const clientTickets = selected ? mockSupportTickets.filter((t) => t.clientId === selected) : [];
  const clientReports = selected ? mockReports.filter((r) => r.clientId === selected) : [];

  if (selectedClient) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <button onClick={() => setSelected(null)} className="text-sm text-primary hover:underline">← Back to Clients</button>
          <div className="bg-card rounded-lg border border-border p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-heading font-bold text-foreground">{selectedClient.name}</h1>
                <p className="text-sm text-muted-foreground">{selectedClient.contactName} · {selectedClient.industry}</p>
              </div>
              <StatusBadge status={selectedClient.status} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-sm">
              <div><span className="text-muted-foreground">Email:</span> <span className="text-foreground">{selectedClient.email}</span></div>
              <div><span className="text-muted-foreground">Phone:</span> <span className="text-foreground">{selectedClient.phone}</span></div>
              <div><span className="text-muted-foreground">Since:</span> <span className="text-foreground">{selectedClient.createdAt}</span></div>
            </div>
          </div>

          {/* Linked data */}
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-card rounded-lg border border-border">
              <div className="px-4 py-3 border-b border-border"><h3 className="text-sm font-heading font-semibold">Projects ({clientProjects.length})</h3></div>
              <div className="divide-y divide-border">
                {clientProjects.map((p) => (
                  <Link key={p.id} to={`/admin/projects/${p.id}`} className="px-4 py-3 flex items-center justify-between hover:bg-muted/20">
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      <StatusBadge status={p.buildStage} />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
                {clientProjects.length === 0 && <p className="px-4 py-6 text-sm text-muted-foreground text-center">No projects</p>}
              </div>
            </div>
            <div className="bg-card rounded-lg border border-border">
              <div className="px-4 py-3 border-b border-border"><h3 className="text-sm font-heading font-semibold">Support ({clientTickets.length})</h3></div>
              <div className="divide-y divide-border">
                {clientTickets.map((t) => (
                  <div key={t.id} className="px-4 py-3 flex items-center justify-between">
                    <p className="text-sm text-foreground">{t.subject}</p>
                    <StatusBadge status={t.status} />
                  </div>
                ))}
                {clientTickets.length === 0 && <p className="px-4 py-6 text-sm text-muted-foreground text-center">No tickets</p>}
              </div>
            </div>
            <div className="bg-card rounded-lg border border-border lg:col-span-2">
              <div className="px-4 py-3 border-b border-border"><h3 className="text-sm font-heading font-semibold">Reports ({clientReports.length})</h3></div>
              <div className="divide-y divide-border">
                {clientReports.map((r) => (
                  <div key={r.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{r.title}</p>
                      <p className="text-xs text-muted-foreground">{r.date}</p>
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
          <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your client base.</p>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Industry</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Contact</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((client) => (
                  <tr key={client.id} onClick={() => setSelected(client.id)} className="hover:bg-muted/20 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{client.name}</p>
                      <p className="text-xs text-muted-foreground">{client.contactName}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{client.industry}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{client.email}</td>
                    <td className="px-4 py-3"><StatusBadge status={client.status} /></td>
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

export default Clients;
