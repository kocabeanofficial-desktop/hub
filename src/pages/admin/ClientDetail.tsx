import { Link, useParams } from "react-router-dom";
import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Globe, Mail, Phone, Building2, ArrowRight, CheckCircle2, AlertCircle, Loader2, PauseCircle, PlayCircle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClient } from "@/hooks/useClients";
import { useClientProjects } from "@/hooks/useSupabaseData";
import { useWebsitesByClient } from "@/hooks/useWebsites";
import { ClientServicesSection } from "@/components/clients/ClientServicesSection";
import { ClientHostingSection } from "@/components/clients/ClientHostingSection";
import { supabase } from "@/integrations/supabase/client";
import { callInviteFunction } from "@/lib/inviteFunction";
import { toast } from "@/hooks/use-toast";
import type { DbClient } from "@/types/database";

const ClientDetail = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const { data: client, isLoading, isError } = useClient(clientId);
  const { data: websites = [], isLoading: websitesLoading } = useWebsitesByClient(clientId);
  const { data: projects = [], isLoading: projectsLoading } = useClientProjects(clientId);
  const queryClient = useQueryClient();
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const handleClientStatusChange = async (status: "active" | "inactive") => {
    if (!client) return;

    setUpdatingStatus(true);
    const { error } = await supabase
      .from("clients")
      .update({ status })
      .eq("id", client.id);
    setUpdatingStatus(false);

    if (error) {
      toast({ title: "Status update failed", description: error.message, variant: "destructive" });
      return;
    }

    queryClient.setQueryData<DbClient | null>(["client", client.id], (current) =>
      current ? { ...current, status } : current,
    );
    queryClient.setQueryData<DbClient[]>(["clients"], (current) =>
      current?.map((item) => (item.id === client.id ? { ...item, status } : item)) ?? current,
    );
    queryClient.setQueryData<DbClient[]>(["clients", "by-business-name"], (current) =>
      current?.map((item) => (item.id === client.id ? { ...item, status } : item)) ?? current,
    );
    queryClient.invalidateQueries({ queryKey: ["client", client.id] });
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    queryClient.invalidateQueries({ queryKey: ["clients", "by-business-name"] });
    toast({
      title: status === "active" ? "Client activated" : "Client paused",
      description: `${client.business_name} is now ${status}.`,
    });
  };

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
                <div className="flex items-center gap-2">
                  <StatusBadge status={client.status} />
                  {client.status === "inactive" && (
                    <Button
                      size="sm"
                      className="gap-1.5"
                      disabled={updatingStatus}
                      onClick={() => handleClientStatusChange("active")}
                    >
                      {updatingStatus ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <PlayCircle className="h-3.5 w-3.5" />
                      )}
                      Activate Client
                    </Button>
                  )}
                  {client.status === "active" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-warning/40 hover:bg-warning/10"
                      disabled={updatingStatus}
                      onClick={() => handleClientStatusChange("inactive")}
                    >
                      {updatingStatus ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <PauseCircle className="h-3.5 w-3.5" />
                      )}
                      Pause Client
                    </Button>
                  )}
                </div>
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

            <ClientAccessSection client={client} />

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

            <ClientServicesSection clientId={client.id} />

            <section className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-heading font-semibold text-foreground">
                    Projects
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Projects are linked to this existing client record by client_id.
                  </p>
                </div>
              </div>

              {projectsLoading && (
                <div className="text-sm text-muted-foreground">Loading projects...</div>
              )}

              {!projectsLoading && projects.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-8 text-center">
                  <p className="text-sm font-medium text-foreground">No linked projects yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    New projects should be linked to this client, not a duplicate client record.
                  </p>
                </div>
              )}

              {!projectsLoading && projects.length > 0 && (
                <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                  {projects.map((project) => (
                    <li key={project.id}>
                      <Link
                        to={`/admin/projects/${project.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {project.project_name || "Untitled project"}
                          </p>
                          {project.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {project.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <StatusBadge status={project.stage} />
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <ClientHostingSection clientId={client.id} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ClientDetail;

function ClientAccessSection({ client }: { client: DbClient }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState(client.email ?? "");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSuccess(null);
    setError(null);

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setError("Admin session expired. Please sign in again.");
        return;
      }

      const { data, error: fnError } = await callInviteFunction(
        {
          action: "manage_login",
          client_id: client.id,
          client_email: email.trim().toLowerCase(),
          client_name: client.business_name || "",
          password,
        },
        accessToken,
      );

      if (fnError || data?.error) {
        setError(data?.error || fnError?.message || "Failed to update client login.");
        return;
      }

      setSuccess(`Login updated for ${data.email}.`);
      setPassword("");
      queryClient.invalidateQueries({ queryKey: ["client", client.id] });
      queryClient.invalidateQueries({ queryKey: ["clients", "by-business-name"] });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update client login.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyDetails() {
    const text = [
      "Koca Bean Client Portal",
      "Login: https://hub.kocabean.co.za/login",
      `Email: ${email.trim()}`,
      password ? `Password: ${password}` : "Password: [enter the password you set]",
    ].join("\n");

    await navigator.clipboard.writeText(text);
    setSuccess("Login details copied.");
  }

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <h2 className="text-base font-heading font-semibold text-foreground">Client Access</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Set or reset this client's portal login. This links the auth user to this client record.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="client-login-email">Login email</Label>
          <Input
            id="client-login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="client@example.com"
            disabled={submitting}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="client-login-password">Password</Label>
          <Input
            id="client-login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            disabled={submitting}
          />
        </div>

        {error && (
          <div className="sm:col-span-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {success && (
          <div className="sm:col-span-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-foreground">{success}</p>
          </div>
        )}

        <div className="sm:col-span-2 flex items-center justify-end gap-2 flex-wrap">
          <Button type="button" variant="outline" onClick={copyDetails} disabled={!email.trim()}>
            Copy Login Details
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Updating..." : "Update Login"}
          </Button>
        </div>
      </form>
    </section>
  );
}
