import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileText, Globe, ArrowRight } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useWebsite, useWebsitePages } from "@/hooks/useWebsites";

const WebsiteContent = () => {
  const { websiteId } = useParams<{ websiteId: string }>();
  const { data: website, isLoading: wLoading } = useWebsite(websiteId);
  const { data: pages = [], isLoading: pLoading } = useWebsitePages(websiteId);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <Link
          to={website ? `/admin/clients/${website.client_id}` : "/admin/clients"}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Client
        </Link>

        {wLoading && <div className="text-sm text-muted-foreground">Loading website…</div>}

        {!wLoading && !website && (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-sm font-medium text-foreground">Website not found</p>
          </div>
        )}

        {website && (
          <>
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <h1 className="text-2xl font-heading font-bold text-foreground tracking-tight">
                    {website.name}
                  </h1>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Globe className="h-4 w-4" />
                    {website.domain || "No domain"}
                    {website.platform && (
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-muted text-xs font-medium">
                        {website.platform}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    website.is_active
                      ? "bg-success/15 text-success"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {website.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            <section className="rounded-xl border border-border bg-card">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-base font-heading font-semibold text-foreground">
                  Pages
                </h2>
              </div>
              {pLoading && (
                <div className="px-6 py-6 text-sm text-muted-foreground">Loading pages…</div>
              )}
              {!pLoading && pages.length === 0 && (
                <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                  No pages configured for this website yet.
                </div>
              )}
              <ul className="divide-y divide-border">
                {pages.map((p) => (
                  <li key={p.id}>
                    <Link
                      to={`/admin/websites/${websiteId}/content/${p.id}`}
                      className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {p.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            /{p.slug}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-medium text-primary">Edit Content</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default WebsiteContent;
