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

type SupabaseArchiveError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

export type ActiveIntakeSubmissionsResult = {
  submissions: DbIntakeSubmission[];
  archiveSupported: boolean;
};

export const ARCHIVE_FIELDS_UNAVAILABLE_MESSAGE =
  "Archive fields are not available yet. Enquiries are visible, but archive/delete is disabled until the database migration is applied.";

export const isMissingArchiveColumnError = (error: unknown) => {
  const value = (error || {}) as SupabaseArchiveError;
  const combined = [value.code, value.message, value.details, value.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    combined.includes("deleted_at") &&
    (combined.includes("does not exist") ||
      combined.includes("could not find") ||
      combined.includes("schema cache") ||
      combined.includes("42703"))
  );
};

export async function fetchActiveIntakeSubmissions(): Promise<ActiveIntakeSubmissionsResult> {
  const archiveAware = await supabase
    .from("intake_submissions")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (!archiveAware.error) {
    return {
      submissions: (archiveAware.data ?? []) as DbIntakeSubmission[],
      archiveSupported: true,
    };
  }

  if (!isMissingArchiveColumnError(archiveAware.error)) throw archiveAware.error;

  console.warn("Archive fields are not available; loading enquiries without archive filter.", archiveAware.error);

  const fallback = await supabase
    .from("intake_submissions")
    .select("*")
    .order("created_at", { ascending: false });

  if (fallback.error) throw fallback.error;

  return {
    submissions: (fallback.data ?? []) as DbIntakeSubmission[],
    archiveSupported: false,
  };
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
  useQuery({
    queryKey: ["intake_submissions"],
    queryFn: async () => {
      const { submissions } = await fetchActiveIntakeSubmissions();
      return submissions;
    },
  });

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

export const useHostingAccounts = () =>
  useQuery({ queryKey: ["hosting_accounts"], queryFn: () => fetchTable<DbHostingAccount>("hosting_accounts") });

export const useDomains = () =>
  useQuery({ queryKey: ["domains"], queryFn: () => fetchTable<DbDomain>("domains") });

export const useMailboxes = () =>
  useQuery({ queryKey: ["mailboxes"], queryFn: () => fetchTable<DbMailbox>("mailboxes") });

export const useClientHostingAccounts = (clientId: string | undefined) =>
  useQuery({
    queryKey: ["hosting_accounts", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase.from("hosting_accounts").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DbHostingAccount[];
    },
    enabled: !!clientId,
  });

export const useClientDomains = (clientId: string | undefined) =>
  useQuery({
    queryKey: ["domains", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase.from("domains").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DbDomain[];
    },
    enabled: !!clientId,
  });

export const useClientMailboxes = (clientId: string | undefined) =>
  useQuery({
    queryKey: ["mailboxes", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase.from("mailboxes").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DbMailbox[];
    },
    enabled: !!clientId,
  });
