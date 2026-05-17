import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useWebsitesByClient, useWebsitePages } from "@/hooks/useWebsites";
import {
  usePageFields,
  usePageContentValues,
  useSaveContentValues,
  useUploadWebsiteImage,
  type Field,
} from "@/hooks/useWebsiteContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Globe, Save, ExternalLink, AlertCircle, ImageIcon, Upload } from "lucide-react";
import { toast } from "sonner";

interface FieldGroup {
  key: string;
  title: string;
  fieldKeys: string[];
}

const approvedGroups: FieldGroup[] = [
  {
    key: "hero",
    title: "Hero",
    fieldKeys: ["hero_headline", "hero_subheadline"],
  },
  {
    key: "buttons-links",
    title: "Buttons & Links",
    fieldKeys: ["primary_button_text", "primary_button_url", "whatsapp_button_text", "whatsapp_url"],
  },
  {
    key: "opening-hours",
    title: "Opening Hours",
    fieldKeys: ["weekday_hours", "saturday_hours", "sunday_hours"],
  },
  {
    key: "contact-details",
    title: "Contact Details",
    fieldKeys: ["contact_phone", "contact_email", "address", "footer_contact_text"],
  },
  {
    key: "images",
    title: "Images",
    fieldKeys: ["hero_image", "promo_banner_text", "promo_banner_image"],
  },
];

const approvedFieldKeys = new Set(approvedGroups.flatMap((group) => group.fieldKeys));
const imageFieldKeys = new Set(["hero_image", "promo_banner_image"]);
const imageTypes = new Set(["image", "image_upload"]);

const getInputType = (field: Field) => {
  if (field.field_type === "email") return "email";
  if (field.field_type === "phone") return "tel";
  if (["button_url", "link", "url"].includes(field.field_type) || field.field_key.endsWith("_url")) {
    return "url";
  }
  return "text";
};

const isTextareaField = (field: Field) =>
  field.field_type === "textarea" ||
  field.field_type === "rich_text" ||
  /subheadline|address|description|notes|footer_contact_text|promo_banner_text/i.test(field.field_key);

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
  const save = useSaveContentValues();
  const uploadImage = useUploadWebsiteImage();

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const valueByField = useMemo(() => {
    const map: Record<string, string> = {};
    for (const v of values) map[v.field_id] = v.value ?? "";
    return map;
  }, [values]);

  const visibleFields = useMemo(() => {
    const byKey = new Map<string, Field>();

    for (const field of fields) {
      if (!approvedFieldKeys.has(field.field_key) || byKey.has(field.field_key)) continue;
      byKey.set(field.field_key, field);
    }

    return approvedGroups.flatMap((group) =>
      group.fieldKeys
        .map((fieldKey) => byKey.get(fieldKey))
        .filter((field): field is Field => Boolean(field)),
    );
  }, [fields]);

  useEffect(() => {
    const initial: Record<string, string> = {};
    for (const f of visibleFields) {
      initial[f.id] = valueByField[f.id] ?? f.default_value ?? "";
    }
    setDraft(initial);
  }, [visibleFields, valueByField]);

  const fieldGroups = useMemo(
    () =>
      approvedGroups
        .map((group) => ({
          ...group,
          fields: group.fieldKeys
            .map((fieldKey) => visibleFields.find((field) => field.field_key === fieldKey))
            .filter((field): field is Field => Boolean(field)),
        }))
        .filter((group) => group.fields.length > 0),
    [visibleFields],
  );

  const handleImageUpload = async (field: Field, file: File | undefined) => {
    if (!website || !file) return;

    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const publicUrl = await uploadImage.mutateAsync({
        websiteId: website.id,
        fieldId: field.id,
        file,
      });
      setDraft((current) => ({ ...current, [field.id]: publicUrl }));
      setStatusMessage(`${field.label} uploaded. Save changes to publish it.`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Image upload failed";
      setErrorMessage(message);
      toast.error(message);
    }
  };

  const handleSave = async () => {
    if (!website || !homepage) return;
    setStatusMessage(null);
    setErrorMessage(null);

    const payloads = visibleFields.map((f) => ({
      website_id: website.id,
      field_id: f.id,
      value: draft[f.id] ?? "",
      updated_by: user?.id ?? null,
    }));

    try {
      await save.mutateAsync(payloads);
      setStatusMessage("Website content saved.");
      toast.success("Website content updated");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to save";
      setErrorMessage(message);
      toast.error(message);
    }
  };

  const renderField = (field: Field) => {
    const value = draft[field.id] ?? "";
    const isImage = imageTypes.has(field.field_type) || imageFieldKeys.has(field.field_key);

    if (isImage) {
      const isUploading = uploadImage.isPending;

      return (
        <div key={field.id} className="space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor={field.id} className="text-sm font-semibold text-foreground">
              {field.label}
            </Label>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-mono">
              image
            </span>
          </div>

          {value ? (
            <div className="rounded-xl border border-border overflow-hidden bg-muted/20">
              <img
                src={value}
                alt={field.label}
                className="h-44 w-full object-cover"
                onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              No image uploaded yet.
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              id={`upload-${field.id}`}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={isUploading}
              onChange={(event) => handleImageUpload(field, event.target.files?.[0])}
            />
            <Button type="button" variant="outline" disabled={isUploading} className="sm:w-auto cursor-pointer" asChild>
              <label htmlFor={`upload-${field.id}`}>
                <Upload className="h-4 w-4" />
                {isUploading ? "Uploading..." : value ? "Replace Image" : "Upload Image"}
              </label>
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div key={field.id} className="space-y-2">
        <Label htmlFor={field.id} className="text-sm font-semibold text-foreground">
          {field.label}
        </Label>
        {isTextareaField(field) ? (
          <Textarea
            id={field.id}
            rows={3}
            value={value}
            onChange={(e) => setDraft((current) => ({ ...current, [field.id]: e.target.value }))}
            placeholder={field.default_value ?? ""}
          />
        ) : (
          <Input
            id={field.id}
            type={getInputType(field)}
            value={value}
            onChange={(e) => setDraft((current) => ({ ...current, [field.id]: e.target.value }))}
            placeholder={field.default_value ?? ""}
          />
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">Edit Website Content</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Update the approved content shown on your public site.
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
            Loading...
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
        ) : visibleFields.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-6 text-sm text-muted-foreground">
            No editable fields are configured for this site yet.
          </div>
        ) : (
          <div className="space-y-4">
            {fieldGroups.map((group) => (
              <div key={group.key} className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6 space-y-4">
                <div>
                  <h2 className="text-base font-heading font-bold text-foreground">{group.title}</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Edit only the approved content fields for this section.
                  </p>
                </div>
                <div className="space-y-4">
                  {group.fields.map((field) => renderField(field))}
                </div>
              </div>
            ))}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6 space-y-3">
              {statusMessage && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
                  {statusMessage}
                </div>
              )}
              {errorMessage && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                  {errorMessage}
                </div>
              )}
              <div className="flex items-center justify-end gap-2">
                <Button onClick={handleSave} disabled={save.isPending}>
                  <Save className="h-4 w-4" /> {save.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ClientWebsite;
