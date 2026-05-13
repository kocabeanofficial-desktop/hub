import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useWebsite, usePage } from "@/hooks/useWebsites";
import {
  usePageSections,
  usePageFields,
  usePageContentValues,
  useSaveContentValues,
  type Field,
  type SaveContentValuePayload,
} from "@/hooks/useWebsiteContent";
import { FieldEditor } from "@/components/content/FieldEditor";

const PageContentEditor = () => {
  const { websiteId, pageId } = useParams<{ websiteId: string; pageId: string }>();
  const { user } = useAuth();

  const { data: website } = useWebsite(websiteId);
  const { data: page, isLoading: pageLoading } = usePage(pageId);
  const { data: sections = [] } = usePageSections(pageId);
  const { data: fields = [], isLoading: fieldsLoading } = usePageFields(pageId);
  const { data: values = [], isLoading: valuesLoading } = usePageContentValues(
    websiteId,
    pageId,
  );
  const saveMutation = useSaveContentValues();

  // form state: field_id -> value
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [initialValues, setInitialValues] = useState<Record<string, string>>({});

  // Hydrate form when fields/values load
  useEffect(() => {
    if (fieldsLoading || valuesLoading) return;
    const valueByField = new Map(values.map((v) => [v.field_id, v.value ?? ""]));
    const next: Record<string, string> = {};
    for (const f of fields) {
      next[f.id] = valueByField.has(f.id)
        ? (valueByField.get(f.id) ?? "")
        : (f.default_value ?? "");
    }
    setFormValues(next);
    setInitialValues(next);
  }, [fields, values, fieldsLoading, valuesLoading]);

  const grouped = useMemo(() => {
    const sectionMap = new Map(sections.map((s) => [s.id, s]));
    const bySection = new Map<string | null, Field[]>();
    for (const f of fields) {
      const key = f.section_id && sectionMap.has(f.section_id) ? f.section_id : null;
      const arr = bySection.get(key) ?? [];
      arr.push(f);
      bySection.set(key, arr);
    }
    const groups: { id: string | null; title: string; fields: Field[] }[] = [];
    // Sectioned groups in section sort order
    for (const s of sections) {
      const fs = bySection.get(s.id);
      if (fs && fs.length) groups.push({ id: s.id, title: s.title, fields: fs });
    }
    // Ungrouped
    const ungrouped = bySection.get(null);
    if (ungrouped && ungrouped.length) {
      groups.push({ id: null, title: "Other", fields: ungrouped });
    }
    return groups;
  }, [sections, fields]);

  const isDirty = useMemo(
    () => Object.keys(formValues).some((k) => formValues[k] !== initialValues[k]),
    [formValues, initialValues],
  );

  const handleChange = (fieldId: string, value: string) =>
    setFormValues((prev) => ({ ...prev, [fieldId]: value }));

  const handleSave = async () => {
    if (!websiteId || !pageId) return;
    const changed: SaveContentValuePayload[] = Object.entries(formValues)
      .filter(([fieldId, value]) => value !== initialValues[fieldId])
      .map(([fieldId, value]) => ({
        website_id: websiteId,
        page_id: pageId,
        field_id: fieldId,
        value,
        updated_by: user?.id ?? null,
      }));

    if (changed.length === 0) {
      toast({ title: "Nothing to save", description: "No changes detected." });
      return;
    }

    try {
      await saveMutation.mutateAsync(changed);
      setInitialValues(formValues);
      toast({
        title: "Content saved",
        description: `${changed.length} field${changed.length === 1 ? "" : "s"} updated.`,
      });
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link
            to={`/admin/websites/${websiteId}/content`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Pages
          </Link>
          <Button
            onClick={handleSave}
            disabled={!isDirty || saveMutation.isPending}
            size="sm"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1.5" />
            )}
            Save Changes
          </Button>
        </div>

        {pageLoading && <div className="text-sm text-muted-foreground">Loading page…</div>}

        {!pageLoading && !page && (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-sm font-medium text-foreground">Page not found</p>
          </div>
        )}

        {page && (
          <>
            <div className="rounded-xl border border-border bg-card p-6">
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                {website?.name ?? "Website"}
              </p>
              <h1 className="text-2xl font-heading font-bold text-foreground tracking-tight mt-1">
                {page.title}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">/{page.slug}</p>
              {page.description && (
                <p className="text-sm text-foreground mt-3">{page.description}</p>
              )}
            </div>

            {fieldsLoading || valuesLoading ? (
              <div className="text-sm text-muted-foreground">Loading content…</div>
            ) : grouped.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                No editable fields configured for this page.
              </div>
            ) : (
              grouped.map((group) => (
                <section
                  key={group.id ?? "ungrouped"}
                  className="rounded-xl border border-border bg-card"
                >
                  <div className="px-6 py-4 border-b border-border">
                    <h2 className="text-base font-heading font-semibold text-foreground">
                      {group.title}
                    </h2>
                  </div>
                  <div className="p-6 space-y-5">
                    {group.fields.map((f) => (
                      <FieldEditor
                        key={f.id}
                        field={f}
                        value={formValues[f.id] ?? ""}
                        onChange={(v) => handleChange(f.id, v)}
                      />
                    ))}
                  </div>
                </section>
              ))
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PageContentEditor;
