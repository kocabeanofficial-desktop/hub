import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DbClient } from "@/types/database";

export const renewalServiceOptions = [
  "Domain Renewal",
  "Hosting Renewal",
  "Email Hosting",
  "Website Management",
  "SEO Management",
  "Social Media Management",
  "Maintenance Plan",
  "Custom Retainer",
  "Other",
] as const;

export type RenewalStatus = "draft" | "active" | "paid" | "overdue" | "cancelled";
export type RenewalServiceStatus = "active" | "inactive" | "cancelled";
export type RenewalActionStatus = "pending" | "completed" | "skipped";
export type RenewalChannel = "email" | "whatsapp" | "dashboard" | "admin_task";

export interface RenewalInvoice {
  id: string;
  client_id: string;
  uploaded_by: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  invoice_due_date: string | null;
  renewal_date: string;
  domain_or_service: string;
  invoice_amount: number | null;
  balance_due: number | null;
  invoice_file_path: string | null;
  status: RenewalStatus;
  created_at: string;
  updated_at: string;
  client?: Pick<DbClient, "id" | "business_name" | "email" | "phone" | "website_url"> | null;
}

export interface RenewalService {
  id: string;
  renewal_invoice_id: string;
  client_id: string;
  service_type: string;
  service_name: string;
  amount: number | null;
  status: RenewalServiceStatus;
  renewal_date: string;
  created_at: string;
  updated_at: string;
}

export interface RenewalAction {
  id: string;
  renewal_invoice_id: string;
  client_id: string;
  action_type: string;
  channel: RenewalChannel;
  scheduled_date: string;
  status: RenewalActionStatus;
  message_subject: string | null;
  message_body: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RenewalDraftInput {
  client_id: string;
  uploaded_by?: string | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  invoice_due_date?: string | null;
  renewal_date: string;
  domain_or_service: string;
  invoice_amount?: number | null;
  balance_due?: number | null;
  invoice_file_path?: string | null;
  status?: RenewalStatus;
}

const renewalSelect = `
  *,
  client:clients(id, business_name, email, phone, website_url)
`;

const money = (value: number | null | undefined) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(Number(value ?? 0));

const displayDate = (date: string | null | undefined) =>
  date ? new Date(`${date}T00:00:00`).toLocaleDateString("en-ZA", { dateStyle: "medium" }) : "not set";

const clientName = (invoice: RenewalInvoice) => invoice.client?.business_name || "Client";

export const getRenewalWhatsAppMessage = (invoice: RenewalInvoice) =>
  `Hi ${clientName(invoice)}, hope you're well.\n\nYour Koca Bean service renewal for ${invoice.domain_or_service} is coming up on ${displayDate(invoice.renewal_date)}.\n\nAmount due: ${money(invoice.balance_due)}\nInvoice due date: ${displayDate(invoice.invoice_due_date)}\n\nPlease arrange payment before the due date to avoid interruption to your domain, hosting, email, or website services.\n\nProof of payment can be sent here or to accounts@kocabean.co.za.\n\nThank you,\nKoca Bean`;

export const getRenewalEmailSubject = (invoice: RenewalInvoice) =>
  `Renewal Reminder: ${invoice.domain_or_service}`;

export const getRenewalEmailBody = (invoice: RenewalInvoice) =>
  `Dear ${clientName(invoice)},\n\nI hope you are well.\n\nYour Koca Bean service renewal for ${invoice.domain_or_service} is coming up on ${displayDate(invoice.renewal_date)}.\n\nInvoice number: ${invoice.invoice_number || "not set"}\nAmount due: ${money(invoice.balance_due)}\nInvoice due date: ${displayDate(invoice.invoice_due_date)}\n\nPlease arrange payment before the due date to avoid interruption to your domain, hosting, email, or website services.\n\nOnce payment has been made, please send proof of payment to accounts@kocabean.co.za or reply to this email.\n\nKind regards,\nKoca Bean Accounts Department`;

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const toDateOnly = (date: Date) => date.toISOString().slice(0, 10);

const buildActionTimeline = (invoice: RenewalInvoice): Array<Omit<RenewalAction, "id" | "created_at" | "updated_at" | "completed_at">> => {
  const renewalDate = new Date(`${invoice.renewal_date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const actionSeeds = [
    { offset: -183, action_type: "early_notice", channel: "email" as RenewalChannel, label: "Early renewal notice" },
    { offset: -92, action_type: "planning_reminder", channel: "dashboard" as RenewalChannel, label: "Planning reminder" },
    { offset: -30, action_type: "invoice_reminder", channel: "email" as RenewalChannel, label: "Invoice reminder" },
    { offset: -15, action_type: "payment_reminder", channel: "whatsapp" as RenewalChannel, label: "Payment reminder" },
    { offset: -7, action_type: "urgent_reminder", channel: "whatsapp" as RenewalChannel, label: "Urgent reminder" },
    { offset: -1, action_type: "final_reminder", channel: "whatsapp" as RenewalChannel, label: "Final reminder" },
    { offset: 0, action_type: "arrears_notice", channel: "dashboard" as RenewalChannel, label: "Dashboard arrears notice" },
    { offset: 3, action_type: "overdue_follow_up", channel: "whatsapp" as RenewalChannel, label: "Overdue follow-up" },
    { offset: 7, action_type: "admin_escalation", channel: "admin_task" as RenewalChannel, label: "Admin escalation task" },
  ];

  return actionSeeds.map((seed) => {
    const scheduled = addDays(renewalDate, seed.offset);
    const isPast = scheduled < today;
    return {
      renewal_invoice_id: invoice.id,
      client_id: invoice.client_id,
      action_type: seed.action_type,
      channel: seed.channel,
      scheduled_date: toDateOnly(scheduled),
      status: isPast ? "skipped" : "pending",
      message_subject: seed.channel === "email" ? getRenewalEmailSubject(invoice) : seed.label,
      message_body: seed.channel === "email" ? getRenewalEmailBody(invoice) : getRenewalWhatsAppMessage(invoice),
    };
  });
};

export const useRenewalInvoices = () =>
  useQuery({
    queryKey: ["renewal_invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("renewal_invoices")
        .select(renewalSelect)
        .order("renewal_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as RenewalInvoice[];
    },
  });

export const useRenewalInvoice = (id: string | undefined) =>
  useQuery({
    queryKey: ["renewal_invoice", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("renewal_invoices")
        .select(renewalSelect)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as RenewalInvoice | null;
    },
    enabled: !!id,
  });

export const useRenewalServices = (renewalInvoiceId: string | undefined) =>
  useQuery({
    queryKey: ["renewal_services", renewalInvoiceId],
    queryFn: async () => {
      if (!renewalInvoiceId) return [];
      const { data, error } = await supabase
        .from("renewal_services")
        .select("*")
        .eq("renewal_invoice_id", renewalInvoiceId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as RenewalService[];
    },
    enabled: !!renewalInvoiceId,
  });

export const useRenewalActions = (renewalInvoiceId: string | undefined) =>
  useQuery({
    queryKey: ["renewal_actions", renewalInvoiceId],
    queryFn: async () => {
      if (!renewalInvoiceId) return [];
      const { data, error } = await supabase
        .from("renewal_actions")
        .select("*")
        .eq("renewal_invoice_id", renewalInvoiceId)
        .order("scheduled_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as RenewalAction[];
    },
    enabled: !!renewalInvoiceId,
  });

export const useClientRenewalInvoices = (clientId: string | undefined) =>
  useQuery({
    queryKey: ["renewal_invoices", "client", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("renewal_invoices")
        .select(renewalSelect)
        .eq("client_id", clientId)
        .in("status", ["active", "overdue"])
        .order("renewal_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as RenewalInvoice[];
    },
    enabled: !!clientId,
  });

export const useCreateRenewalInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RenewalDraftInput) => {
      const { data, error } = await supabase
        .from("renewal_invoices")
        .insert({ ...input, updated_at: new Date().toISOString() })
        .select(renewalSelect)
        .single();
      if (error) throw error;
      return data as RenewalInvoice;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["renewal_invoices"] }),
  });
};

export const useUpdateRenewalStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: RenewalStatus }) => {
      const { data, error } = await supabase
        .from("renewal_invoices")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select(renewalSelect)
        .single();
      if (error) throw error;
      return data as RenewalInvoice;
    },
    onSuccess: (invoice) => {
      qc.invalidateQueries({ queryKey: ["renewal_invoices"] });
      qc.invalidateQueries({ queryKey: ["renewal_invoice", invoice.id] });
    },
  });
};

export const useActivateRenewal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoice, serviceTypes }: { invoice: RenewalInvoice; serviceTypes: string[] }) => {
      if (serviceTypes.length === 0) throw new Error("Select at least one renewal service.");

      const serviceRows = serviceTypes.map((serviceType) => ({
        renewal_invoice_id: invoice.id,
        client_id: invoice.client_id,
        service_type: serviceType,
        service_name: serviceType,
        amount: null,
        status: "active",
        renewal_date: invoice.renewal_date,
        updated_at: new Date().toISOString(),
      }));

      const actionRows = buildActionTimeline(invoice);

      const { error: serviceError } = await supabase
        .from("renewal_services")
        .delete()
        .eq("renewal_invoice_id", invoice.id);
      if (serviceError) throw serviceError;

      const { error: actionDeleteError } = await supabase
        .from("renewal_actions")
        .delete()
        .eq("renewal_invoice_id", invoice.id);
      if (actionDeleteError) throw actionDeleteError;

      const { error: insertServiceError } = await supabase.from("renewal_services").insert(serviceRows);
      if (insertServiceError) throw insertServiceError;

      const { error: insertActionError } = await supabase.from("renewal_actions").insert(actionRows);
      if (insertActionError) throw insertActionError;

      const { data, error } = await supabase
        .from("renewal_invoices")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("id", invoice.id)
        .select(renewalSelect)
        .single();
      if (error) throw error;
      return data as RenewalInvoice;
    },
    onSuccess: (invoice) => {
      qc.invalidateQueries({ queryKey: ["renewal_invoices"] });
      qc.invalidateQueries({ queryKey: ["renewal_invoice", invoice.id] });
      qc.invalidateQueries({ queryKey: ["renewal_services", invoice.id] });
      qc.invalidateQueries({ queryKey: ["renewal_actions", invoice.id] });
    },
  });
};

export const useSaveDraftRenewalServices = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoice, serviceTypes }: { invoice: RenewalInvoice; serviceTypes: string[] }) => {
      const serviceRows = serviceTypes.map((serviceType) => ({
        renewal_invoice_id: invoice.id,
        client_id: invoice.client_id,
        service_type: serviceType,
        service_name: serviceType,
        amount: null,
        status: "inactive",
        renewal_date: invoice.renewal_date,
        updated_at: new Date().toISOString(),
      }));

      const { error: deleteError } = await supabase
        .from("renewal_services")
        .delete()
        .eq("renewal_invoice_id", invoice.id);
      if (deleteError) throw deleteError;

      if (serviceRows.length === 0) return invoice;

      const { error } = await supabase.from("renewal_services").insert(serviceRows);
      if (error) throw error;
      return invoice;
    },
    onSuccess: (invoice) => {
      qc.invalidateQueries({ queryKey: ["renewal_services", invoice.id] });
    },
  });
};

export const useUploadRenewalInvoicePdf = () =>
  useMutation({
    mutationFn: async ({ clientId, file }: { clientId: string; file: File }) => {
      if (file.type !== "application/pdf") throw new Error("Please upload a PDF invoice.");
      if (file.size > 10 * 1024 * 1024) throw new Error("Please upload a PDF smaller than 10 MB.");

      const safeName = file.name.replace(/[^a-z0-9.-]+/gi, "-").toLowerCase();
      const path = `${clientId}/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage.from("renewal-invoices").upload(path, file, {
        contentType: "application/pdf",
        upsert: false,
      });
      if (error) throw error;
      return path;
    },
  });
