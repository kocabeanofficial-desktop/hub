import { Link, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  getRenewalEmailBody,
  getRenewalEmailSubject,
  getRenewalWhatsAppMessage,
  useActivateRenewal,
  useRenewalActions,
  useRenewalInvoice,
  useRenewalServices,
  useUpdateRenewalStatus,
  renewalServiceOptions,
} from "@/hooks/useRenewals";
import { ArrowLeft, CheckCircle2, Copy, Loader2, XCircle } from "lucide-react";

const money = (value: number | null | undefined) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(Number(value ?? 0));

const dateLabel = (value: string | null | undefined) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-ZA", { dateStyle: "medium" }) : "-";

const statusClass: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-blue-500/10 text-blue-700",
  paid: "bg-emerald-500/10 text-emerald-700",
  overdue: "bg-destructive/10 text-destructive",
  cancelled: "bg-slate-700/10 text-slate-700",
  pending: "bg-amber-500/10 text-amber-600",
  completed: "bg-emerald-500/10 text-emerald-700",
  skipped: "bg-slate-100 text-slate-500 border border-slate-200",
  inactive: "bg-muted text-muted-foreground",
};

const RenewalDetail = () => {
  const { renewalId } = useParams();
  const { toast } = useToast();
  const { data: invoice, isLoading } = useRenewalInvoice(renewalId);
  const { data: services = [] } = useRenewalServices(renewalId);
  const { data: actions = [] } = useRenewalActions(renewalId);
  const updateStatus = useUpdateRenewalStatus();
  const activateRenewal = useActivateRenewal();

  const copy = async (label: string, text: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: `${label} copied` });
  };

  const changeStatus = async (status: "paid" | "overdue" | "cancelled") => {
    if (!invoice) return;
    await updateStatus.mutateAsync({ id: invoice.id, status });
    toast({ title: `Renewal marked ${status}` });
  };

  const activateDraft = async () => {
    if (!invoice) return;
    const serviceTypes = services.length > 0 ? services.map((service) => service.service_type) : [...renewalServiceOptions.slice(0, 1)];
    await activateRenewal.mutateAsync({ invoice, serviceTypes });
    toast({ title: "Renewal actions activated" });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="text-sm text-muted-foreground">Loading renewal...</div>
      </DashboardLayout>
    );
  }

  if (!invoice) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Button asChild variant="outline" size="sm"><Link to="/admin/renewals"><ArrowLeft className="h-4 w-4" /> Back</Link></Button>
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Renewal not found.</div>
        </div>
      </DashboardLayout>
    );
  }

  const whatsAppMessage = getRenewalWhatsAppMessage(invoice);
  const emailSubject = getRenewalEmailSubject(invoice);
  const emailBody = getRenewalEmailBody(invoice);
  const pendingWhatsApp = actions.find((action) => action.channel === "whatsapp" && action.status === "pending");
  const pendingEmail = actions.find((action) => action.channel === "email" && action.status === "pending");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
              <Link to="/admin/renewals"><ArrowLeft className="h-4 w-4" /> Back to renewals</Link>
            </Button>
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">{invoice.domain_or_service}</h1>
            <p className="text-sm text-muted-foreground mt-1">{invoice.client?.business_name || "Client"} renewal details.</p>
          </div>
          <span className={`self-start text-xs font-medium px-2 py-1 rounded-md ${statusClass[invoice.status] || statusClass.draft}`}>
            {invoice.status}
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 bg-card rounded-2xl border border-border shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-heading font-bold text-foreground">Invoice details</h2>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Client:</span> <span className="font-medium">{invoice.client?.business_name || "-"}</span></div>
              <div><span className="text-muted-foreground">Invoice:</span> <span className="font-medium">{invoice.invoice_number || "-"}</span></div>
              <div><span className="text-muted-foreground">Invoice date:</span> <span className="font-medium">{dateLabel(invoice.invoice_date)}</span></div>
              <div><span className="text-muted-foreground">Invoice due:</span> <span className="font-medium">{dateLabel(invoice.invoice_due_date)}</span></div>
              <div><span className="text-muted-foreground">Renewal date:</span> <span className="font-medium">{dateLabel(invoice.renewal_date)}</span></div>
              <div><span className="text-muted-foreground">Balance due:</span> <span className="font-medium">{money(invoice.balance_due)}</span></div>
              <div className="sm:col-span-2"><span className="text-muted-foreground">PDF path:</span> <span className="font-mono text-xs">{invoice.invoice_file_path || "No PDF uploaded"}</span></div>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm p-5 space-y-3">
            <h2 className="text-sm font-heading font-bold text-foreground">Actions</h2>
            {invoice.status === "draft" && (
              <Button className="w-full justify-start" onClick={activateDraft} disabled={activateRenewal.isPending}>
                {activateRenewal.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Activate Renewal Actions
              </Button>
            )}
            <Button variant="outline" className="w-full justify-start" onClick={() => changeStatus("paid")} disabled={updateStatus.isPending}>
              <CheckCircle2 className="h-4 w-4" /> Mark as Paid
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => changeStatus("overdue")} disabled={updateStatus.isPending}>
              <XCircle className="h-4 w-4" /> Mark as Overdue
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => changeStatus("cancelled")} disabled={updateStatus.isPending}>
              <XCircle className="h-4 w-4" /> Cancel Renewal
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => copy("WhatsApp message", whatsAppMessage)}>
              <Copy className="h-4 w-4" /> Copy WhatsApp Message
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => copy("Email message", `Subject: ${emailSubject}\n\n${emailBody}`)}>
              <Copy className="h-4 w-4" /> Copy Email Message
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/client">View Client Dashboard Notice</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="bg-card rounded-2xl border border-border shadow-sm">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-heading font-bold text-foreground">Active services</h2>
            </div>
            <div className="divide-y divide-border">
              {services.map((service) => (
                <div key={service.id} className="px-5 py-3.5 flex items-center justify-between">
                  <span className="text-sm font-medium">{service.service_name}</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded-md ${statusClass[service.status] || statusClass.active}`}>{service.status}</span>
                </div>
              ))}
              {services.length === 0 && <p className="px-5 py-8 text-sm text-muted-foreground text-center">No services activated yet.</p>}
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-heading font-bold text-foreground">Action timeline</h2>
            </div>
            <div className="divide-y divide-border">
              {actions.map((action) => (
                <div
                  key={action.id}
                  className={`px-5 py-3.5 ${action.status === "skipped" ? "bg-muted/30 opacity-80" : ""}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className={`text-sm font-medium ${action.status === "skipped" ? "text-muted-foreground" : "text-foreground"}`}>
                        {action.action_type.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">{action.channel} · {dateLabel(action.scheduled_date)}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-md ${statusClass[action.status] || statusClass.pending}`}>{action.status}</span>
                  </div>
                </div>
              ))}
              {actions.length === 0 && <p className="px-5 py-8 text-sm text-muted-foreground text-center">No timeline generated yet.</p>}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5 space-y-3">
            <h2 className="text-sm font-heading font-bold text-foreground">WhatsApp preview</h2>
            <Textarea readOnly rows={10} value={pendingWhatsApp?.message_body || whatsAppMessage} />
          </div>
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5 space-y-3">
            <h2 className="text-sm font-heading font-bold text-foreground">Email preview</h2>
            <Input readOnly value={pendingEmail?.message_subject || emailSubject} />
            <Textarea readOnly rows={10} value={pendingEmail?.message_body || emailBody} />
            <p className="text-xs text-muted-foreground">Email sending is not connected yet. Use Copy Email Message for V1.</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default RenewalDetail;
