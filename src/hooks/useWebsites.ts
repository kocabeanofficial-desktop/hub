import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Website {
  id: string;
  client_id: string;
  name: string;
  domain: string | null;
  platform: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Page {
  id: string;
  website_id: string;
  title: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export const useWebsitesByClient = (clientId: string | undefined) =>
  useQuery({
    queryKey: ["websites", "by-client", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("websites")
        .select("*")
        .eq("client_id", clientId)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Website[];
    },
    enabled: !!clientId,
  });

export const useWebsite = (websiteId: string | undefined) =>
  useQuery({
    queryKey: ["website", websiteId],
    queryFn: async () => {
      if (!websiteId) return null;
      const { data, error } = await supabase
        .from("websites")
        .select("*")
        .eq("id", websiteId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Website | null;
    },
    enabled: !!websiteId,
  });

export const useWebsitePages = (websiteId: string | undefined) =>
  useQuery({
    queryKey: ["pages", "by-website", websiteId],
    queryFn: async () => {
      if (!websiteId) return [];
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .eq("website_id", websiteId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Page[];
    },
    enabled: !!websiteId,
  });

export const usePage = (pageId: string | undefined) =>
  useQuery({
    queryKey: ["page", pageId],
    queryFn: async () => {
      if (!pageId) return null;
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .eq("id", pageId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Page | null;
    },
    enabled: !!pageId,
  });
