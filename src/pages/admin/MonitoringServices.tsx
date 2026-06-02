import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  formatServiceDate,
  formatServiceDateTime,
  formatServiceMoney,
  getDaysUntilDue,
  getReminderLevel,
  reminderLabels,
  useCompleteServicePaymentReminders,
  useMonitoredServices,
  type MonitoredServiceWithReminders,
} from "@/hooks/useServiceMonitoring";
import { Activity, CalendarClock, CheckCircle2, Eye, Loader2, Receipt, Server, ShieldAlert } from "lucide-react";
import type { ServiceReminderLevel } from "@/types/database";

const pillStyles: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  paused: "bg-amber-500/10 text-amber-700 border-amber-200",
  cancelled: "bg-slate-500/10 text-slate-700 border-slate-200",
  archived: "bg-muted text-muted-foreground border-border",
  running: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  degraded: "bg-amber-500/10 text-amber-700 border-amber-200",
  down: "bg-destructive/10 text-destructive border-destructive/20",
  unknown: "bg-muted text-muted-foreground border-border",
};

const reminderStyles: Record<ServiceReminderLevel, string> = {
  ok: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  upcoming: "bg-sky-500/10 text-sky-700 border-sky-200",
  due_soon: "bg-amber-500/10 text-amber-700 border-amber-200",
  urgent: "bg-orange-500/10 text-orange-700 border-orange-200",
  due_today: "bg-rose-500/10 text-rose-700 border-rose-200",
  overdue: "bg-destructive/10 text-destructive border-destructive/20",
};

const titleCase = (value: string | null | undefined) =>
  value ? value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "-";

const Pill = ({ value, styles = pillStyles }: { value: string; styles?: Record<string, string> }) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[value] || pillStyles.unknown}`}>
    {titleCase(value)}
  </span>
);

const daysLabel = (days: number | null) => {
  if (days === null) return "-";
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "1 day";
  return `${days} days`;
};

const pendingReminders = (service: MonitoredServiceWithReminders) =>
  (service.payment_reminders ?? []).filter((reminder) => reminder.status === "pending");

const recentLogs = (service: MonitoredServiceWithReminders) =>
  [...(service.service_check_logs ?? [])]
    .sort((a, b) => new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime())
    .slice(0, 5);

const MonitoringServices = () => {
  const { toast } = useToast();
  const { data: services = [], isLoading } = useMonitoredServices();
  const completeReminders = useCompleteServicePaymentReminders();
  const [selectedService, setSelectedService] = useState<MonitoredServiceWithReminders | null>(null);

  const metrics = useMemo(() => {
    const levels = services.map((service) => getReminderLevel(service.next_due_date));
    return {
      total: services.length,
      running: services.filter((service) => service.health === "running").length,
      pending: services.reduce((sum, service) => sum + pendingReminders(service).length, 0),
      needsAttention: levels.filter((level) => level !== "ok").length,
    };
  }, [services]);

  const handleComplete = async (service: MonitoredServiceWithReminders) => {
    try {
      const completed = await completeReminders.mutateAsync(service.id);
      toast({
        title: "Payment reminder completed",
        description: `${completed.length} pending reminder${completed.length === 1 ? "" : "s"} marked as completed.`,
      });
    } catch (error) {
      toast({
        title: "Could not complete reminder",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">Service Monitoring</h1>
            <p className="mt-1 text-sm text-muted-foreground">Admin service health and dashboard-only payment reminders.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard title="Services" value={metrics.total} icon={Server} variant="primary" />
          <StatCard title="Running" value={metrics.running} icon={Activity} variant="success" />
          <StatCard title="Pending Reminders" value={metrics.pending} icon={Receipt} variant={metrics.pending > 0 ? "warning" : "default"} />
          <StatCard title="Needs Attention" value={metrics.needsAttention} icon={ShieldAlert} variant={metrics.needsAttention > 0 ? "warning" : "default"} />
        </div>

        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-4 py-3.5">
            <h2 className="text-sm font-heading font-bold text-foreground">Services</h2>
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Provider</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Health</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cost</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Due</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reminder</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last Checked</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {services.map((service) => {
                  const reminderLevel = getReminderLevel(service.next_due_date);
                  const pending = pendingReminders(service);
                  return (
                    <tr key={service.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3.5 align-top">
                        <p className="font-medium text-foreground">{service.service_name}</p>
                        <p className="text-xs text-muted-foreground">{titleCase(service.service_type)} - {titleCase(service.environment)}</p>
                      </td>
                      <td className="px-4 py-3.5 align-top text-muted-foreground">{service.provider || "-"}</td>
                      <td className="px-4 py-3.5 align-top"><Pill value={service.health} /></td>
                      <td className="px-4 py-3.5 align-top"><Pill value={service.status} /></td>
                      <td className="px-4 py-3.5 align-top text-muted-foreground">{formatServiceMoney(service.monthly_cost, service.currency)}</td>
                      <td className="px-4 py-3.5 align-top">
                        <p className="text-foreground">{formatServiceDate(service.next_due_date)}</p>
                        <p className="text-xs text-muted-foreground">{daysLabel(getDaysUntilDue(service.next_due_date))}</p>
                      </td>
                      <td className="px-4 py-3.5 align-top"><Pill value={reminderLevel} styles={reminderStyles} /></td>
                      <td className="px-4 py-3.5 align-top text-muted-foreground">{formatServiceDateTime(service.last_checked_at)}</td>
                      <td className="px-4 py-3.5 align-top">
                        <div className="flex justify-end gap-2">
                          {pending.length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleComplete(service)}
                              disabled={completeReminders.isPending}
                            >
                              <CheckCircle2 className="h-4 w-4" /> Complete
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => setSelectedService(service)}>
                            <Eye className="h-4 w-4" /> Details
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-border lg:hidden">
            {services.map((service) => {
              const reminderLevel = getReminderLevel(service.next_due_date);
              const pending = pendingReminders(service);
              return (
                <article key={service.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{service.service_name}</h3>
                      <p className="text-xs text-muted-foreground">{titleCase(service.service_type)} - {service.provider || "-"}</p>
                    </div>
                    <Pill value={reminderLevel} styles={reminderStyles} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><span className="text-muted-foreground">Environment</span><p className="font-medium">{titleCase(service.environment)}</p></div>
                    <div><span className="text-muted-foreground">Health</span><p><Pill value={service.health} /></p></div>
                    <div><span className="text-muted-foreground">Status</span><p><Pill value={service.status} /></p></div>
                    <div><span className="text-muted-foreground">Cost</span><p className="font-medium">{formatServiceMoney(service.monthly_cost, service.currency)}</p></div>
                    <div><span className="text-muted-foreground">Next due</span><p className="font-medium">{formatServiceDate(service.next_due_date)}</p></div>
                    <div><span className="text-muted-foreground">Days</span><p className="font-medium">{daysLabel(getDaysUntilDue(service.next_due_date))}</p></div>
                    <div className="col-span-2"><span className="text-muted-foreground">Last checked</span><p className="font-medium">{formatServiceDateTime(service.last_checked_at)}</p></div>
                  </div>
                  {service.notes && <p className="text-xs text-muted-foreground">{service.notes}</p>}
                  <div className="flex flex-wrap gap-2">
                    {pending.length > 0 && (
                      <Button size="sm" variant="outline" onClick={() => handleComplete(service)} disabled={completeReminders.isPending}>
                        <CheckCircle2 className="h-4 w-4" /> Complete Reminder
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setSelectedService(service)}>
                      <Eye className="h-4 w-4" /> View Details
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>

          {isLoading && (
            <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading services...
            </div>
          )}
          {!isLoading && services.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">No monitored services yet.</div>
          )}
        </section>
      </div>

      <Dialog open={!!selectedService} onOpenChange={(open) => !open && setSelectedService(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          {selectedService && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedService.service_name}</DialogTitle>
                <DialogDescription>{selectedService.hostname || selectedService.service_url || "Service details"}</DialogDescription>
              </DialogHeader>

              <div className="grid gap-5">
                <section className="grid gap-3 rounded-xl border border-border p-4 text-sm sm:grid-cols-2">
                  <div><span className="text-muted-foreground">Type</span><p className="font-medium">{titleCase(selectedService.service_type)}</p></div>
                  <div><span className="text-muted-foreground">Provider</span><p className="font-medium">{selectedService.provider || "-"}</p></div>
                  <div><span className="text-muted-foreground">Environment</span><p className="font-medium">{titleCase(selectedService.environment)}</p></div>
                  <div><span className="text-muted-foreground">Billing</span><p className="font-medium">{titleCase(selectedService.billing_cycle)}</p></div>
                  <div><span className="text-muted-foreground">Service URL</span><p className="break-all font-medium">{selectedService.service_url || "-"}</p></div>
                  <div><span className="text-muted-foreground">Login URL</span><p className="break-all font-medium">{selectedService.login_url || "-"}</p></div>
                  <div><span className="text-muted-foreground">Monthly cost</span><p className="font-medium">{formatServiceMoney(selectedService.monthly_cost, selectedService.currency)}</p></div>
                  <div><span className="text-muted-foreground">Next due</span><p className="font-medium">{formatServiceDate(selectedService.next_due_date)} ({daysLabel(getDaysUntilDue(selectedService.next_due_date))})</p></div>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Admin Notes</h3>
                  <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
                    <p>{selectedService.notes || "No service notes."}</p>
                    {selectedService.admin_notes && <p className="mt-2">{selectedService.admin_notes}</p>}
                  </div>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Recent Check Logs</h3>
                  <div className="overflow-hidden rounded-xl border border-border">
                    {recentLogs(selectedService).map((log) => (
                      <div key={log.id} className="grid gap-1 border-b border-border p-3 text-sm last:border-b-0 sm:grid-cols-[1.2fr_0.7fr_0.7fr_1.6fr]">
                        <span className="text-muted-foreground">{formatServiceDateTime(log.checked_at)}</span>
                        <span><Pill value={log.health} /></span>
                        <span className="text-muted-foreground">{log.status_code || "-"} / {log.response_time_ms ? `${log.response_time_ms}ms` : "-"}</span>
                        <span className="text-muted-foreground">{log.message || "-"}</span>
                      </div>
                    ))}
                    {recentLogs(selectedService).length === 0 && <p className="p-4 text-sm text-muted-foreground">No check logs yet.</p>}
                  </div>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Payment Reminders</h3>
                  <div className="overflow-hidden rounded-xl border border-border">
                    {(selectedService.payment_reminders ?? []).map((reminder) => (
                      <div key={reminder.id} className="grid gap-1 border-b border-border p-3 text-sm last:border-b-0 sm:grid-cols-[1fr_1fr_1fr_1.4fr]">
                        <span className="font-medium">{formatServiceDate(reminder.due_date)}</span>
                        <span><Pill value={reminder.reminder_level} styles={reminderStyles} /></span>
                        <span className="text-muted-foreground">{titleCase(reminder.status)}</span>
                        <span className="text-muted-foreground">{reminder.notes || "-"}</span>
                      </div>
                    ))}
                    {(selectedService.payment_reminders ?? []).length === 0 && <p className="p-4 text-sm text-muted-foreground">No payment reminders yet.</p>}
                  </div>
                </section>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default MonitoringServices;
