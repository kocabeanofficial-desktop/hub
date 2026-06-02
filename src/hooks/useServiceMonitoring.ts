import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  DbMonitoredService,
  DbServiceCheckLog,
  DbServicePaymentReminder,
  ServiceReminderLevel,
} from "@/types/database";

export interface MonitoredServiceWithReminders extends DbMonitoredService {
  payment_reminders?: DbServicePaymentReminder[];
  service_check_logs?: DbServiceCheckLog[];
}

export const reminderLabels: Record<ServiceReminderLevel, string> = {
  ok: "OK",
  upcoming: "Upcoming",
  due_soon: "Due Soon",
  urgent: "Urgent",
  due_today: "Due Today",
  overdue: "Overdue",
};

export const getDaysUntilDue = (dueDate: string | null | undefined) => {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
};

export const getReminderLevel = (dueDate: string | null | undefined): ServiceReminderLevel => {
  const days = getDaysUntilDue(dueDate);
  if (days === null) return "ok";
  if (days < 0) return "overdue";
  if (days === 0) return "due_today";
  if (days <= 2) return "urgent";
  if (days <= 6) return "due_soon";
  if (days <= 14) return "upcoming";
  return "ok";
};

export const formatServiceMoney = (value: number | null | undefined, currency = "ZAR") =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency }).format(Number(value ?? 0));

export const formatServiceDate = (value: string | null | undefined) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-ZA") : "-";

export const formatServiceDateTime = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" }) : "-";

export const useMonitoredServices = () =>
  useQuery({
    queryKey: ["monitored_services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monitored_services")
        .select("*, payment_reminders:service_payment_reminders(*), service_check_logs(*)")
        .order("next_due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MonitoredServiceWithReminders[];
    },
  });

export const useCompleteServicePaymentReminders = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (serviceId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("service_payment_reminders")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          completed_by: userData.user?.id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("service_id", serviceId)
        .eq("status", "pending")
        .select("*");
      if (error) throw error;
      return (data ?? []) as DbServicePaymentReminder[];
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["monitored_services"] });
    },
  });
};
