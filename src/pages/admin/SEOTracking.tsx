import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useTasks, useClients, useProjects } from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";
import type { DbClientService } from "@/types/database";

const SEO_SERVICE_CODES = new Set(["seo", "basic_seo", "seo_management", "website_seo"]);
const NON_SEO_ONLY_SERVICE_CODES = new Set([
  "business_email",
  "business_email_10",
  "business_email_30",
  "business_email_50",
  "email_migration",
  "email_migration_setup",
  "email_only",
  "hosting_email",
  "domain_only",
  "domain_transfer",
  "hosting_transfer",
  "billing_request",
  "renewal_request",
  "general_enquiry",
]);
const PROJECT_SERVICE_CODES = new Set([
  "website_build",
  "website_redesign",
  "ecommerce_build",
  "booking_system",
  "custom_web_app",
  "smart_website",
  "smart_ecommerce",
  "smart_system",
  "advanced_web_system",
]);
const WEBSITE_PROJECT_TYPES = new Set([
  "website",
  "ecommerce",
  "website_build",
  "website_redesign",
  "ecommerce_build",
  "booking_system",
  "custom_web_app",
  "smart_website",
  "smart_ecommerce",
  "smart_system",
  "advanced_web_system",
]);

const SEOTracking = () => {
  const { data: tasks = [], isLoading } = useTasks();
  const { data: clients = [] } = useClients();
  const { data: projects = [] } = useProjects();
  const { data: clientServices = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["client_services", "seo_visibility"],
    queryFn: async () => {
      const { data, error } = await supabase.from("client_services").select("*");
      if (error) throw error;
      return (data ?? []) as DbClientService[];
    },
  });

  const websiteClientIds = new Set(
    projects
      .filter((project) => WEBSITE_PROJECT_TYPES.has(project.project_type))
      .map((project) => project.client_id)
      .filter(Boolean),
  );
  const seoActiveClientIds = new Set(
    clientServices
      .filter((service) => service.is_active && service.status === "active" && SEO_SERVICE_CODES.has(service.service_code))
      .map((service) => service.client_id),
  );
  const projectServiceClientIds = new Set(
    clientServices
      .filter((service) => service.is_active && service.status === "active" && PROJECT_SERVICE_CODES.has(service.service_code))
      .map((service) => service.client_id),
  );
  const nonSeoOnlyClientIds = new Set(
    clientServices
      .filter((service) => service.is_active && service.status === "active" && NON_SEO_ONLY_SERVICE_CODES.has(service.service_code))
      .map((service) => service.client_id),
  );
  const seoCapableClientIds = new Set(
    [...websiteClientIds].filter((clientId) => !nonSeoOnlyClientIds.has(clientId) || projectServiceClientIds.has(clientId)),
  );
  const seoTasks = tasks.filter(
    (task) =>
      (task.task_type === "seo" || task.task_type === "website_management") &&
      !!task.client_id &&
      seoCapableClientIds.has(task.client_id) &&
      seoActiveClientIds.has(task.client_id),
  );
  const seoAvailableClients = clients.filter(
    (client) => seoCapableClientIds.has(client.id) && !seoActiveClientIds.has(client.id),
  );

  const getClientName = (clientId: string | null) => {
    if (!clientId) return "-";
    return clients.find((c) => c.id === clientId)?.business_name || "-";
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">SEO & Website Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track SEO only for website, ecommerce, and system clients with SEO activated.
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Task</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Client</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Due Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {seoTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-foreground">{task.title}</p>
                      <p className="text-xs text-muted-foreground sm:hidden mt-0.5">{getClientName(task.client_id)}</p>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell">{getClientName(task.client_id)}</td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell">{task.task_type || "-"}</td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">
                      {task.due_date ? new Date(task.due_date).toLocaleDateString("en-ZA") : "-"}
                    </td>
                    <td className="px-4 py-3.5"><StatusBadge status={task.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(isLoading || servicesLoading) && <div className="px-4 py-12 text-center text-sm text-muted-foreground">Loading...</div>}
          {!isLoading && !servicesLoading && seoTasks.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">No active SEO tasks yet.</div>
          )}
        </div>

        {seoAvailableClients.length > 0 && (
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="px-4 py-3.5 border-b border-border">
              <h2 className="text-sm font-heading font-bold text-foreground">SEO available but not activated</h2>
              <p className="text-xs text-muted-foreground mt-1">
                These clients have website/ecommerce/system projects, but no active SEO service.
              </p>
            </div>
            <div className="divide-y divide-border">
              {seoAvailableClients.map((client) => (
                <div key={client.id} className="px-4 py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{client.business_name}</p>
                    <p className="text-xs text-muted-foreground">{client.email || "No email on file"}</p>
                  </div>
                  <StatusBadge status="not_activated" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SEOTracking;
