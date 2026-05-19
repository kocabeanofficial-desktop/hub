import { Link, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useClientRenewalInvoices } from "@/hooks/useRenewals";
import { AlertTriangle, ArrowLeft, CalendarClock, MessageSquare } from "lucide-react";

const money = (value: number | null | undefined) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(Number(value ?? 0));

const dateLabel = (value: string | null | undefined) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-ZA", { dateStyle: "medium" }) : "Not set";

const statusClass: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-blue-500/10 text-blue-700",
  paid: "bg-emerald-500/10 text-emerald-700",
  overdue: "bg-destructive/10 text-destructive",
  cancelled: "bg-slate-700/10 text-slate-700",
};

const ClientRenewalDetail = () => {
  const { renewalId } = useParams();
  const { user } = useAuth();
  const { data: renewals = [], isLoading } = useClientRenewalInvoices(user?.clientId);
  const renewal = renewals.find((item) => item.id === renewalId);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/client"><ArrowLeft className="h-4 w-4" /> Back to dashboard</Link>
        </Button>

        {isLoading ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading renewal...</div>
        ) : !renewal ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Renewal not found.</div>
        ) : (
          <>
            {renewal.status === "overdue" && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-destructive">Service in arrears</p>
                  <p className="text-sm text-foreground mt-1">
                    Your service renewal for {renewal.domain_or_service} is now overdue. Please contact Koca Bean or arrange payment to avoid service interruption.
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-border bg-card shadow-sm p-5 sm:p-6 space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Renewal Details</p>
                  <h1 className="text-xl font-heading font-extrabold text-foreground mt-0.5">{renewal.domain_or_service}</h1>
                  <p className="text-sm text-muted-foreground mt-1">Read-only renewal notice from Koca Bean.</p>
                </div>
                <span className={`self-start text-xs font-medium px-2 py-1 rounded-md ${statusClass[renewal.status] || statusClass.active}`}>
                  {renewal.status}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 text-sm border-t border-border pt-5">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Renewal date</p>
                  <p className="font-medium text-foreground">{dateLabel(renewal.renewal_date)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Invoice due date</p>
                  <p className="font-medium text-foreground">{dateLabel(renewal.invoice_due_date)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Invoice number</p>
                  <p className="font-medium text-foreground">{renewal.invoice_number || "Not set"}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Amount due</p>
                  <p className="font-medium text-foreground">{money(renewal.balance_due)}</p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                Please arrange payment before the due date to avoid interruption to your domain, hosting, email, or website services. Proof of payment can be sent to accounts@kocabean.co.za.
              </div>

              <Button asChild>
                <Link to="/client/support"><MessageSquare className="h-4 w-4" /> Contact Koca Bean</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ClientRenewalDetail;
