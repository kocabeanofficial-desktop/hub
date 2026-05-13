import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Section {
  id: string;
  page_id: string;
  title: string;
  sort_order: number;
  created_at: string;
}

export interface Field {
  id: string;
  page_id: string;
  section_id: string | null;
  field_type: string;
  label: string;
  key: string;
  default_value: string | null;
  sort_order: number;
  created_at: string;
}

export interface ContentValue {
  id: string;
  website_id: string;
  page_id: string;
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
      const { data, error } = await supabase
        .from("fields")
        .select("*")
        .eq("page_id", pageId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Field[];
    },
    enabled: !!pageId,
  });

export const usePageContentValues = (
  websiteId: string | undefined,
  pageId: string | undefined,
) =>
  useQuery({
    queryKey: ["content_values", websiteId, pageId],
    queryFn: async () => {
      if (!websiteId || !pageId) return [];
      const { data, error } = await supabase
        .from("content_values")
        .select("*")
        .eq("website_id", websiteId)
        .eq("page_id", pageId);
      if (error) throw error;
      return (data ?? []) as ContentValue[];
    },
    enabled: !!websiteId && !!pageId,
  });

export interface SaveContentValuePayload {
  website_id: string;
  page_id: string;
  field_id: string;
  value: string;
  updated_by?: string | null;
}

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
          queryKey: ["content_values", first.website_id, first.page_id],
        });
      }
    },
  });
};
