import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ZohoMetrics {
  totalOutstanding: number;
  overdueCount: number;
  activeCustomers: number;
}

export const useZohoMetrics = () =>
  useQuery<ZohoMetrics>({
    queryKey: ["zoho_metrics"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);

      const [invoicesRes, customersRes] = await Promise.all([
        supabase
          .from("zoho_invoices_raw")
          .select("balance, due_date, status"),
        supabase
          .from("zoho_customers_raw")
          .select("id", { count: "exact", head: true }),
      ]);

      if (invoicesRes.error) throw invoicesRes.error;
      if (customersRes.error) throw customersRes.error;

      const invoices = invoicesRes.data ?? [];
      const totalOutstanding = invoices.reduce((sum, inv) => sum + Number(inv.balance ?? 0), 0);
      const overdueCount = invoices.filter(
        (inv) =>
          Number(inv.balance ?? 0) > 0 &&
          inv.due_date &&
          inv.due_date < today &&
          (inv.status ?? "").toLowerCase() !== "paid",
      ).length;

      return {
        totalOutstanding,
        overdueCount,
        activeCustomers: customersRes.count ?? 0,
      };
    },
  });

export const formatZAR = (n: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(n);
