import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useReports, useClients } from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

const statusStyle: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-emerald-500/10 text-emerald-600",
  pending: "bg-amber-500/10 text-amber-600",
};

const Reports = () => {
  const { data: reports = [], isLoading } = useReports();
  const { data: clients = [] } = useClients();
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clientId, setClientId] = useState("");
  const [reportType, setReportType] = useState("monthly_service");
  const [periodStart, setPeriodStart] = useState<Date | undefined>();
  const [periodEnd, setPeriodEnd] = useState<Date | undefined>();

  const getClientName = (id: string | null) =>
    id ? clients.find((c) => c.id === id)?.business_name || "—" : "—";

  const handleGenerate = async () => {
    if (!clientId) return;
    setSaving(true);
    const clientName = getClientName(clientId);
    const title = `${reportType.replace(/_/g, " ")} — ${clientName}`;
    const { error } = await supabase.from("reports").insert({
      client_id: clientId,
      report_type: reportType,
      title,
      status: "draft",
      period_start: periodStart?.toISOString() || null,
      period_end: periodEnd?.toISOString() || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Failed to create report", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Report created" });
    qc.invalidateQueries({ queryKey: ["reports"] });
    setOpen(false);
    setClientId("");
    setReportType("monthly_service");
    setPeriodStart(undefined);
    setPeriodEnd(undefined);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">Reports</h1>
            <p className="text-sm text-muted-foreground mt-1">View and manage all client reports.</p>
          </div>
          <Button onClick={() => setOpen(true)} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Generate Report
          </Button>
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Report</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Client</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Period</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-foreground">{r.title || "Untitled"}</p>
                      <p className="text-xs text-muted-foreground sm:hidden mt-0.5">{getClientName(r.client_id)}</p>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell">{getClientName(r.client_id)}</td>
                    <td className="px-4 py-3.5 hidden md:table-cell"><StatusBadge status={r.report_type} /></td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell text-xs">
                      {r.period_start && r.period_end
                        ? `${new Date(r.period_start).toLocaleDateString("en-ZA")} – ${new Date(r.period_end).toLocaleDateString("en-ZA")}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{new Date(r.created_at).toLocaleDateString("en-ZA")}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-medium px-2 py-1 rounded-md ${statusStyle[r.status] || statusStyle.draft}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isLoading && <div className="px-4 py-12 text-center text-sm text-muted-foreground">Loading...</div>}
          {!isLoading && reports.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">No reports yet</div>
          )}
        </div>
      </div>

      {/* Generate Report Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold">Generate Report</DialogTitle>
            <DialogDescription>Select a client, report type, and period.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.business_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly_service">Monthly Service</SelectItem>
                  <SelectItem value="job_completion">Job Completion</SelectItem>
                  <SelectItem value="progress_summary">Progress Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>Period Start</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start text-left font-normal text-sm">
                      {periodStart ? periodStart.toLocaleDateString("en-ZA") : "Start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={periodStart} onSelect={setPeriodStart} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-1.5">
                <Label>Period End</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start text-left font-normal text-sm">
                      {periodEnd ? periodEnd.toLocaleDateString("en-ZA") : "End date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={periodEnd} onSelect={setPeriodEnd} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={!clientId || saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Reports;
