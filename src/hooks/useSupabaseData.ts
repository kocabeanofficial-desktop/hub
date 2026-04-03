import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  DbClient, DbContact, DbProject, DbTask,
  DbReport, DbIntakeSubmission, DbAutomationEvent,
  DbService, DbClientService, DbHostingAccount, DbDomain, DbMailbox,
} from "@/types/database";

async function fetchTable<T>(table: string, orderBy = "created_at"): Promise<T[]> {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order(orderBy, { ascending: false });
  if (error) throw error;
  return (data ?? []) as T[];
}

export const useClients = () =>
  useQuery({ queryKey: ["clients"], queryFn: () => fetchTable<DbClient>("clients") });

export const useContacts = () =>
  useQuery({ queryKey: ["contacts"], queryFn: () => fetchTable<DbContact>("contacts") });

export const useProjects = () =>
  useQuery({ queryKey: ["projects"], queryFn: () => fetchTable<DbProject>("projects") });

export const useTasks = () =>
  useQuery({ queryKey: ["tasks"], queryFn: () => fetchTable<DbTask>("tasks") });

export const useReports = () =>
  useQuery({ queryKey: ["reports"], queryFn: () => fetchTable<DbReport>("reports") });

export const useIntakeSubmissions = () =>
  useQuery({ queryKey: ["intake_submissions"], queryFn: () => fetchTable<DbIntakeSubmission>("intake_submissions") });

export const useAutomationEvents = () =>
  useQuery({ queryKey: ["automation_events"], queryFn: () => fetchTable<DbAutomationEvent>("automation_events") });

export const useServices = () =>
  useQuery({ queryKey: ["services"], queryFn: () => fetchTable<DbService>("services", "name") });

export const useClientServices = (clientId: string | undefined) =>
  useQuery({
    queryKey: ["client_services", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("client_services")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DbClientService[];
    },
    enabled: !!clientId,
  });

// Client-scoped queries
export const useClientProjects = (clientId: string | undefined) =>
  useQuery({
    queryKey: ["projects", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DbProject[];
    },
    enabled: !!clientId,
  });

export const useClientReports = (clientId: string | undefined) =>
  useQuery({
    queryKey: ["reports", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DbReport[];
    },
    enabled: !!clientId,
  });

export const useClientTasks = (clientId: string | undefined) =>
  useQuery({
    queryKey: ["tasks", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DbTask[];
    },
    enabled: !!clientId,
  });
