import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useWebsitesByClient, useWebsitePages } from "@/hooks/useWebsites";
import {
  usePageFields,
  usePageContentValues,
  useSaveContentValuesWithLog,
} from "@/hooks/useWebsiteContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Globe, Save, ExternalLink, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const ClientWebsite = () => {
  const { user } = useAuth();
  const {
    data: websites = [],
    isLoading: loadingSites,
    isError: websitesHasError,
    error: websitesError,
  } = useWebsitesByClient(user?.clientId);
  const website = websites[0];
  const websiteErrorMessage =
    websitesError instanceof Error ? websitesError.message : "Unable to load your linked website.";
  const { data: pages = [] } = useWebsitePages(website?.id);
  const homepage = pages[0];
  const { data: fields = [] } = usePageFields(homepage?.id);
  const { data: values = [] } = usePageContentValues(website?.id, homepage?.id);

  const [draft, setDraft] = useState<Record<string, string>>({});

  const valueByField = useMemo(() => {
    const map: Record<string, string> = {};
    for (const v of values) map[v.field_id] = v.value ?? "";
    return map;
  }, [values]);

  // Pass valueByField and clientId so the hook can diff and log correctly
  const save = useSaveContentValuesWithLog(valueByField, user?.clientId ?? null);

  useEffect(() => {
    const initial: Record<string, string> = {};
    for (const f of fields) {
      initial[f.id] = valueByField[f.id] ?? f.default_value ?? "";
    }
    setDraft(initial);
  }, [fields, valueByField]);

  const handleSave = async () => {
    if (!website || !homepage) return;
    const payloads = fields.map((f) => ({
      website_id: website.id,
      field_id: f.id,
      value: draft[f.id] ?? "",
      updated_by: user?.id ?? null,
    }));
    try {
      await save.mutateAsync(payloads);
      toast.success("Website content updated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">Edit Website Content</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Update the headline and contact details shown on your public site.
            </p>
          </div>
          {website?.domain && (
            <Button asChild variant="outline" size="sm">
              <a href={`https://${website.domain}`} target="_blank" rel="noreferrer">
                <Globe className="h-4 w-4" /> Visit Site <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
        </div>

        {loadingSites ? (
          <div className="bg-card rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : websitesHasError ? (
          <div className="bg-card rounded-2xl border border-border p-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Could not load your website</p>
              <p className="text-sm text-muted-foreground mt-1">{websiteErrorMessage}</p>
            </div>
          </div>
        ) : !website ? (
          <div className="bg-card rounded-2xl border border-border p-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">No website linked yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your account isn't connected to a website yet. Please contact support to get set up.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border">
            <div className="divide-y divide-border">
              {fields.map((field) => (
                <div key={field.id} className="p-5 sm:p-6">
                  <Label className="text-sm font-semibold text-foreground mb-2 block">
                    {field.label}
                  </Label>
                  {field.field_type === "textarea" ? (
                    <Textarea
                      value={draft[field.id] ?? ""}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, [field.id]: e.target.value }))
                      }
                      className="resize-y"
                    />
                  ) : (
                    <Input
                      value={draft[field.id] ?? ""}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, [field.id]: e.target.value }))
                      }
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="p-5 sm:p-6 flex items-center justify-end gap-2">
              <Button onClick={handleSave} disabled={save.isPending}>
                <Save className="h-4 w-4" /> {save.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ClientWebsite;
