import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Globe, Mail, Phone, Building2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useClient } from "@/hooks/useClients";

const ClientDetail = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const { data: client, isLoading, isError } = useClient(clientId);

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

            {/* Linked websites placeholder */}
            <section className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-heading font-semibold text-foreground">
                  Linked Websites
                </h2>
              </div>
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <Globe className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">
                  No linked websites yet
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  Website content management isn't connected to this dashboard yet.
                  Once a websites table and content editor are added, linked websites
                  for this client will appear here.
                </p>
              </div>
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ClientDetail;
