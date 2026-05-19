import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useClients } from "@/hooks/useSupabaseData";
import {
  renewalServiceOptions,
  useActivateRenewal,
  useCreateRenewalInvoice,
  useRenewalInvoices,
  useSaveDraftRenewalServices,
  useUploadRenewalInvoicePdf,
  type RenewalDraftInput,
} from "@/hooks/useRenewals";
import { AlertTriangle, CalendarClock, CheckCircle2, Copy, Loader2, Plus, RefreshCw } from "lucide-react";

const todayDate = () => new Date().toISOString().slice(0, 10);

const money = (value: number | null | undefined) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(Number(value ?? 0));

const dateLabel = (value: string | null | undefined) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-ZA") : "-";

const statusClass: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-blue-500/10 text-blue-700",
  paid: "bg-emerald-500/10 text-emerald-700",
  overdue: "bg-destructive/10 text-destructive",
  cancelled: "bg-slate-700/10 text-slate-700",
};

const emptyForm = {
  client_id: "",
  invoice_number: "",
  invoice_date: "",
  invoice_due_date: "",
  renewal_date: "",
  domain_or_service: "",
  invoice_amount: "",
  balance_due: "",
  services: [] as string[],
};

const Renewals = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: renewals = [], isLoading } = useRenewalInvoices();
  const { data: clients = [] } = useClients();
  const uploadPdf = useUploadRenewalInvoicePdf();
  const createRenewal = useCreateRenewalInvoice();
  const activateRenewal = useActivateRenewal();
  const saveDraftServices = useSaveDraftRenewalServices();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const metrics = useMemo(() => {
    const today = todayDate();
    const next30 = new Date();
    next30.setDate(next30.getDate() + 30);
    const next30Date = next30.toISOString().slice(0, 10);

    return {
      active: renewals.filter((r) => r.status === "active").length,
      dueSoon: renewals.filter((r) => r.status === "active" && r.renewal_date >= today && r.renewal_date <= next30Date).length,
      overdue: renewals.filter((r) => r.status === "overdue" || (r.status === "active" && r.renewal_date < today)).length,
      whatsapp: 0,
    };
  }, [renewals]);

  const suggestedClients = useMemo(() => {
    const q = `${form.domain_or_service} ${form.invoice_number}`.toLowerCase();
    if (!q.trim()) return [];
    return clients
      .filter((client) =>
        [client.business_name, client.email, client.website_url]
          .filter(Boolean)
          .some((value) => q.includes(String(value).toLowerCase().replace(/^https?:\/\//, "")) || String(value).toLowerCase().includes(q.trim())),
      )
      .slice(0, 3);
  }, [clients, form.domain_or_service, form.invoice_number]);

  const selectedClient = clients.find((client) => client.id === form.client_id);

  const update = (key: keyof typeof emptyForm, value: string | string[]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const toggleService = (service: string) =>
    setForm((current) => ({
      ...current,
      services: current.services.includes(service)
        ? current.services.filter((item) => item !== service)
        : [...current.services, service],
    }));

  const reset = () => {
    setForm(emptyForm);
    setPdfFile(null);
  };

  const buildInput = (status: "draft" | "active", invoicePath: string | null): RenewalDraftInput => ({
    client_id: form.client_id,
    uploaded_by: user?.id ?? null,
    invoice_number: form.invoice_number || null,
    invoice_date: form.invoice_date || null,
    invoice_due_date: form.invoice_due_date || null,
    renewal_date: form.renewal_date,
    domain_or_service: form.domain_or_service,
    invoice_amount: Number(form.invoice_amount || 0),
    balance_due: Number(form.balance_due || form.invoice_amount || 0),
    invoice_file_path: invoicePath,
    status,
  });

  const saveRenewal = async (activate: boolean) => {
    if (!form.client_id || !form.renewal_date || !form.domain_or_service) {
      toast({ title: "Missing renewal details", description: "Client, domain/service, and renewal date are required.", variant: "destructive" });
      return;
    }
    if (activate && form.services.length === 0) {
      toast({ title: "Select services", description: "Choose at least one service before activation.", variant: "destructive" });
      return;
    }

    try {
      let invoicePath: string | null = null;
      if (pdfFile) {
        invoicePath = await uploadPdf.mutateAsync({ clientId: form.client_id, file: pdfFile });
      }
      const invoice = await createRenewal.mutateAsync(buildInput(activate ? "active" : "draft", invoicePath));
      if (activate) {
        await activateRenewal.mutateAsync({ invoice, serviceTypes: form.services });
      } else if (form.services.length > 0) {
        await saveDraftServices.mutateAsync({ invoice, serviceTypes: form.services });
      }
      toast({ title: activate ? "Renewal actions activated" : "Renewal draft saved" });
      setOpen(false);
      reset();
      navigate(`/admin/renewals/${invoice.id}`);
    } catch (error) {
      toast({
        title: "Renewal save failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const saving = uploadPdf.isPending || createRenewal.isPending || activateRenewal.isPending || saveDraftServices.isPending;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">Invoice-to-Action Renewals</h1>
            <p className="text-sm text-muted-foreground mt-1">Upload renewal invoices, activate services, and track reminders.</p>
          </div>
          <Button onClick={() => setOpen(true)} size="sm">
            <Plus className="h-4 w-4" /> Upload Invoice
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard title="Active Renewals" value={metrics.active} icon={RefreshCw} variant="success" />
          <StatCard title="Due Next 30 Days" value={metrics.dueSoon} icon={CalendarClock} variant="warning" />
          <StatCard title="Overdue Renewals" value={metrics.overdue} icon={AlertTriangle} variant="warning" />
          <StatCard title="WhatsApp Follow-ups" value={metrics.whatsapp} icon={Copy} variant="primary" />
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Client</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Domain/service</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Renewal</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Invoice due</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Amount</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {renewals.map((renewal) => (
                  <tr key={renewal.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-foreground">{renewal.client?.business_name || "-"}</p>
                      <p className="text-xs text-muted-foreground">{renewal.client?.email || ""}</p>
                    </td>
                    <td className="px-4 py-3.5 text-foreground">{renewal.domain_or_service}</td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell">{dateLabel(renewal.renewal_date)}</td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{dateLabel(renewal.invoice_due_date)}</td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{money(renewal.balance_due)}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-medium px-2 py-1 rounded-md ${statusClass[renewal.status] || statusClass.draft}`}>
                        {renewal.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/admin/renewals/${renewal.id}`}>Open</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isLoading && <div className="px-4 py-12 text-center text-sm text-muted-foreground">Loading renewals...</div>}
          {!isLoading && renewals.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">No renewal invoices yet.</div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload renewal invoice</DialogTitle>
            <DialogDescription>Upload a PDF, confirm the details manually, then save a draft or activate actions.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Invoice PDF</Label>
              <Input type="file" accept="application/pdf" onChange={(event) => setPdfFile(event.target.files?.[0] ?? null)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Client</Label>
              <Select value={form.client_id} onValueChange={(value) => update("client_id", value)}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>{client.business_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {suggestedClients.length > 0 && !selectedClient && (
                <div className="rounded-xl border border-border p-3 text-xs text-muted-foreground">
                  Suggested matches: {suggestedClients.map((client) => client.business_name).join(", ")}
                </div>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>Domain / service reference</Label>
                <Input value={form.domain_or_service} onChange={(e) => update("domain_or_service", e.target.value)} placeholder="smartlook.co.za" />
              </div>
              <div className="grid gap-1.5">
                <Label>Invoice number</Label>
                <Input value={form.invoice_number} onChange={(e) => update("invoice_number", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Invoice date</Label>
                <Input type="date" value={form.invoice_date} onChange={(e) => update("invoice_date", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Invoice due date</Label>
                <Input type="date" value={form.invoice_due_date} onChange={(e) => update("invoice_due_date", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Renewal date</Label>
                <Input type="date" value={form.renewal_date} onChange={(e) => update("renewal_date", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Invoice amount</Label>
                <Input type="number" min="0" step="0.01" value={form.invoice_amount} onChange={(e) => update("invoice_amount", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Balance due</Label>
                <Input type="number" min="0" step="0.01" value={form.balance_due} onChange={(e) => update("balance_due", e.target.value)} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Detected / selected services for this renewal</Label>
              <div className="grid sm:grid-cols-2 gap-2 rounded-xl border border-border p-3">
                {renewalServiceOptions.map((service) => (
                  <label key={service} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.services.includes(service)} onCheckedChange={() => toggleService(service)} />
                    {service}
                  </label>
                ))}
              </div>
            </div>
            <Textarea readOnly value={selectedClient ? `Confirmed client: ${selectedClient.business_name}` : "Select and confirm a client before activation."} />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setOpen(false); reset(); }} disabled={saving}>Cancel</Button>
            <Button variant="outline" onClick={() => saveRenewal(false)} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save Draft
            </Button>
            <Button onClick={() => saveRenewal(true)} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Activate Renewal Actions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Renewals;
