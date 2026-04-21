import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ZohoMetrics {
  totalOutstanding: number;
  overdueCount: number;
  activeCustomers: number;
}

type RawRow = { raw_data?: Record<string, unknown> | null; zoho_customer_id?: string | null };

type RawClient = {
  from: (t: string) => {
    select: (cols: string) => Promise<{
      data: RawRow[] | null;
      error: { message: string } | null;
    }>;
  };
};

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined || v === "") return 0;
  const cleaned = String(v).replace(/[^0-9.\-]/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
};

const parseDate = (v: unknown): Date | null => {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  const iso = new Date(s);
  if (!isNaN(iso.getTime())) return iso;
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const yr = y.length === 2 ? `20${y}` : y;
    const dt = new Date(`${yr}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`);
    if (!isNaN(dt.getTime())) return dt;
  }
  return null;
};

export const useZohoMetrics = () =>
  useQuery<ZohoMetrics>({
    queryKey: ["zoho_metrics"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const client = supabase as unknown as RawClient;

      const [invoicesRes, customersRes] = await Promise.all([
        client.from("zoho_invoices_raw").select("raw_data"),
        client.from("zoho_customers_raw").select("zoho_customer_id"),
      ]);

      if (invoicesRes.error) throw new Error(invoicesRes.error.message);
      if (customersRes.error) throw new Error(customersRes.error.message);

      const invoices = invoicesRes.data ?? [];
      let totalOutstanding = 0;
      let overdueCount = 0;

      for (const inv of invoices) {
        const data = (inv.raw_data ?? {}) as Record<string, unknown>;
        const balance = toNumber(data["Balance"] ?? data["balance"]);
        const status = String(data["Invoice Status"] ?? data["Status"] ?? data["status"] ?? "").trim();
        const dueDate = parseDate(data["Due Date"] ?? data["due_date"]);

        if (status.toLowerCase() !== "closed") {
          totalOutstanding += balance;
        }
        if (balance > 0 && dueDate && dueDate < today) {
          overdueCount += 1;
        }
      }

      const customerIds = new Set(
        (customersRes.data ?? [])
          .map((c) => c.zoho_customer_id)
          .filter((v): v is string => Boolean(v)),
      );

      return {
        totalOutstanding,
        overdueCount,
        activeCustomers: customerIds.size,
      };
    },
  });

export const formatZAR = (n: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(n);
