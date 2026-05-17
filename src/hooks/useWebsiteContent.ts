import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const WEBSITE_MEDIA_BUCKET = "website-media";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface Section {
  id: string;
  page_id: string;
  title: string;
  sort_order: number;
  created_at: string;
}

export interface Field {
  id: string;
  section_id: string | null;
  field_type: string;
  label: string;
  field_key: string;
  default_value: string | null;
  sort_order: number;
  created_at: string;
}

export interface ContentValue {
  id: string;
  website_id: string;
  field_id: string;
  value: string | null;
  updated_by: string | null;
  updated_at: string;
}

export const usePageSections = (pageId: string | undefined) =>
  useQuery({
    queryKey: ["sections", "by-page", pageId],
    queryFn: async () => {
      if (!pageId) return [];
      const { data, error } = await supabase
        .from("sections")
        .select("*")
        .eq("page_id", pageId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Section[];
    },
    enabled: !!pageId,
  });

export const usePageFields = (pageId: string | undefined) =>
  useQuery({
    queryKey: ["fields", "by-page", pageId],
    queryFn: async () => {
      if (!pageId) return [];
      // fields link via section_id -> sections.page_id (no direct page_id on fields)
      const { data: sectionRows, error: sectionError } = await supabase
        .from("sections")
        .select("id")
        .eq("page_id", pageId)
        .eq("is_active", true);
      if (sectionError) throw sectionError;
      if (!sectionRows?.length) return [];
      const sectionIds = sectionRows.map((s) => s.id as string);
      const { data, error } = await supabase
        .from("fields")
        .select("*")
        .in("section_id", sectionIds)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Field[];
    },
    enabled: !!pageId,
  });

export const usePageContentValues = (
  websiteId: string | undefined,
  pageId: string | undefined
) =>
  useQuery({
    queryKey: ["content_values", websiteId, pageId],
    queryFn: async () => {
      if (!websiteId || !pageId) return [];
      // content_values has no page_id column; scoping by website_id is sufficient
      const { data, error } = await supabase
        .from("content_values")
        .select("*")
        .eq("website_id", websiteId);
      if (error) throw error;
      return (data ?? []) as ContentValue[];
    },
    enabled: !!websiteId && !!pageId,
  });

export interface SaveContentValuePayload {
  website_id: string;
  field_id: string;
  value: string;
  updated_by?: string | null;
}

export interface WebsiteImageUploadPayload {
  websiteId: string;
  fieldId: string;
  file: File;
}

export const validateWebsiteImage = (file: File) => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Please upload a JPG, PNG, or WebP image.");
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Please upload an image smaller than 5 MB.");
  }
};

export const useUploadWebsiteImage = () =>
  useMutation({
    mutationFn: async ({ websiteId, fieldId, file }: WebsiteImageUploadPayload) => {
      validateWebsiteImage(file);

      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const safeName = `${fieldId}-${Date.now()}.${extension}`;
      const path = `${websiteId}/${safeName}`;

      const { error } = await supabase.storage
        .from(WEBSITE_MEDIA_BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (error) throw error;

      const { data } = supabase.storage.from(WEBSITE_MEDIA_BUCKET).getPublicUrl(path);
      return data.publicUrl;
    },
  });

export const useSaveContentValues = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payloads: SaveContentValuePayload[]) => {
      if (payloads.length === 0) return [];
      const rows = payloads.map((p) => ({
        ...p,
        updated_at: new Date().toISOString(),
      }));
      const { data, error } = await supabase
        .from("content_values")
        .upsert(rows, { onConflict: "website_id,field_id" })
        .select();
      if (error) throw error;
      return data ?? [];
    },
    onSuccess: (_data, variables) => {
      const first = variables[0];
      if (first) {
        qc.invalidateQueries({
          queryKey: ["content_values", first.website_id],
          exact: false,
        });
      }
    },
  });
};

// ─────────────────────────────────────────────────────────────────
// Change-log types
// ─────────────────────────────────────────────────────────────────

export interface ContentChangeLogPayload {
  client_id:  string | null;
  website_id: string;
  field_id:   string;
  old_value:  string | null;
  new_value:  string;
  changed_by: string | null;
}

// ─────────────────────────────────────────────────────────────────
// useSaveContentValuesWithLog
// Wraps the existing upsert with a change-log step.
// Params:
//   valueByField – map of field_id to currently saved value (for diff)
//   clientId     – the client record UUID (from useAuth().user.clientId)
// Only logs fields where draft value differs from the saved value.
// ─────────────────────────────────────────────────────────────────

export const useSaveContentValuesWithLog = (
  valueByField: Record<string, string>,
  clientId: string | null | undefined
) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payloads: SaveContentValuePayload[]) => {
      if (payloads.length === 0) return [];

      // 1. Build log entries only for changed fields
      const logs: ContentChangeLogPayload[] = payloads
        .filter((p) => {
          const saved = valueByField[p.field_id] ?? "";
          return (p.value ?? "") !== saved;
        })
        .map((p) => ({
          client_id:  clientId ?? null,
          website_id: p.website_id,
          field_id:   p.field_id,
          old_value:  valueByField[p.field_id] ?? null,
          new_value:  p.value ?? "",
          changed_by: p.updated_by ?? null,
        }));

      // 2. Insert logs (non-blocking: log failure should not abort the save)
      if (logs.length > 0) {
        const { error: logError } = await supabase
          .from("content_change_logs")
          .insert(logs);
        if (logError) {
          console.warn("[content_change_logs] insert failed:", logError.message);
        }
      }

      // 3. Upsert content_values (same logic as useSaveContentValues)
      const rows = payloads.map((p) => ({
        ...p,
        updated_at: new Date().toISOString(),
      }));
      const { data, error } = await supabase
        .from("content_values")
        .upsert(rows, { onConflict: "website_id,field_id" })
        .select();
      if (error) throw error;
      return data ?? [];
    },
    onSuccess: (_data, variables) => {
      const first = variables[0];
      if (first) {
        qc.invalidateQueries({
          queryKey: ["content_values", first.website_id],
        });
      }
    },
  });
};
