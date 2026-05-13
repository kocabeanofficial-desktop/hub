import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DbClient } from "@/types/database";

export const useClientsList = () =>
  useQuery({
    queryKey: ["clients", "by-business-name"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("business_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DbClient[];
    },
  });

export const useClient = (id: string | undefined) =>
  useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as DbClient | null;
    },
    enabled: !!id,
  });
