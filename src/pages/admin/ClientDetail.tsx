import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Globe, Mail, Phone, Building2, ArrowRight } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { useClient } from "@/hooks/useClients";
import { useWebsitesByClient } from "@/hooks/useWebsites";

const ClientDetail = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const { data: client, isLoading, isError } = useClient(clientId);
  const { data: websites = [], isLoading: websitesLoading } = useWebsitesByClient(clientId);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <Link
          to="/admin/clients"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Clients
        </Link>

        {isLoading && (
          <div className="text-sm text-muted-foreground">Loading client…</div>
        )}

        {isError && (
          <div className="text-sm text-destructive">Failed to load client.</div>
        )}

        {!isLoading && !client && (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-sm font-medium text-foreground">Client not found</p>
            <p className="text-xs text-muted-foreground mt-1">
              This client may have been removed.
            </p>
          </div>
        )}

        {client && (
          <>
            {/* Header */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <h1 className="text-2xl font-heading font-bold text-foreground tracking-tight">
                    {client.business_name}
                  </h1>
                  {client.trading_name && (
                    <p className="text-sm text-muted-foreground">
                      Trading as <span className="font-medium">{client.trading_name}</span>
                    </p>
                  )}
                </div>
                <StatusBadge status={client.status} />
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {client.email && (
                  <div className="flex items-center gap-2 text-foreground">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${client.email}`} className="hover:text-primary">
                      {client.email}
                    </a>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 text-foreground">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {client.phone}
                  </div>
                )}
                {client.industry && (
                  <div className="flex items-center gap-2 text-foreground">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {client.industry}
                  </div>
                )}
                {client.website_url && (
                  <div className="flex items-center gap-2 text-foreground">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={client.website_url}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-primary truncate"
                    >
                      {client.website_url}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Linked websites */}
            <section className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-heading font-semibold text-foreground">
                  Linked Websites
                </h2>
              </div>

              {websitesLoading && (
                <div className="text-sm text-muted-foreground">Loading websites…</div>
              )}

              {!websitesLoading && websites.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-8 text-center">
                  <Globe className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">
                    No linked websites yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Websites linked to this client will appear here.
                  </p>
                </div>
              )}

              {!websitesLoading && websites.length > 0 && (
                <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                  {websites.map((w) => (
                    <li
                      key={w.id}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {w.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-muted-foreground truncate">
                              {w.domain || "—"}
                            </p>
                            {w.platform && (
                              <span className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground">
                                · {w.platform}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            w.is_active
                              ? "bg-success/15 text-success"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {w.is_active ? "Active" : "Inactive"}
                        </span>
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/admin/websites/${w.id}/content`}>
                            Manage Website Content
                            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                          </Link>
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ClientDetail;
