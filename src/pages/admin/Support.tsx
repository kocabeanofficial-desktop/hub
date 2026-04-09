import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { supabaseCloud } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Loader2, Inbox } from "lucide-react";

/* ─── types ─── */
interface SupportTicket {
  id: string;
  client_id: string | null;
  client_name: string | null;
  subject: string;
  category: string;
  status: string;
  source: string | null;
  description: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface StaffAuth {
  id: string;
  client_id: string;
  owner_name: string;
  owner_email: string;
  staff_full_name: string;
  staff_email: string;
  staff_phone: string | null;
  staff_role: string | null;
  access_email: boolean;
  access_website: boolean;
  access_cpanel: boolean;
  status: string;
  created_at: string;
}

interface UpgradeRequest {
  id: string;
  client_id: string;
  submitter_name: string;
  submitter_email: string;
  business_description: string;
  current_website_url: string | null;
  current_platform: string;
  goals: string | null;
  upgrade_type: string;
  status: string;
  created_at: string;
}

interface WhmAlert {
  id: string;
  domain: string;
  usage_percent: number;
  is_over_80: boolean;
  is_suspended: boolean;
  alert_type: string | null;
  checked_at: string;
}

/* ─── badge helpers ─── */
const ticketStatusColor: Record<string, string> = {
  open: "bg-destructive/10 text-destructive border-destructive/20",
  in_progress: "bg-warning/10 text-warning border-warning/20",
  waiting_client: "bg-yellow-100 text-yellow-700 border-yellow-200",
  resolved: "bg-success/10 text-success border-success/20",
  closed: "bg-muted text-muted-foreground border-border",
};

const categoryColor: Record<string, string> = {
  email: "bg-blue-100 text-blue-700 border-blue-200",
  website: "bg-green-100 text-green-700 border-green-200",
  hosting: "bg-purple-100 text-purple-700 border-purple-200",
  staff_access: "bg-orange-100 text-orange-700 border-orange-200",
  upgrade: "bg-pink-100 text-pink-700 border-pink-200",
};

const staffStatusColor: Record<string, string> = {
  pending_owner_confirm: "bg-warning/10 text-warning border-warning/20",
  credentials_sent: "bg-success/10 text-success border-success/20",
  revoked: "bg-destructive/10 text-destructive border-destructive/20",
};

const upgradeStatusColor: Record<string, string> = {
  new: "bg-info/10 text-info border-info/20",
  contacted: "bg-warning/10 text-warning border-warning/20",
  quoted: "bg-purple-100 text-purple-700 border-purple-200",
  accepted: "bg-success/10 text-success border-success/20",
  declined: "bg-muted text-muted-foreground border-border",
  in_progress: "bg-info/10 text-info border-info/20",
  completed: "bg-success/10 text-success border-success/20",
};

function StatusBadgeCustom({ label, colorMap }: { label: string; colorMap: Record<string, string> }) {
  const style = colorMap[label] || "bg-muted text-muted-foreground border-border";
  const display = label.charAt(0).toUpperCase() + label.slice(1).replace(/_/g, " ");
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", style)}>
      {display}
    </span>
  );
}

/* ─── loading / empty / error ─── */
function TableLoading() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      <span className="ml-2 text-sm text-muted-foreground">Loading…</span>
    </div>
  );
}

function TableEmpty({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <Inbox className="h-8 w-8 mb-2" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function TableError({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <p className="text-sm text-destructive">{message}</p>
    </div>
  );
}

/* ─── data hooks (Cloud Supabase) ─── */
function useTickets() {
  return useQuery<SupportTicket[]>({
    queryKey: ["cloud_support_tickets"],
    queryFn: async () => {
      const { data, error } = await supabaseCloud
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SupportTicket[];
    },
  });
}

function useStaffAuths() {
  return useQuery<StaffAuth[]>({
    queryKey: ["cloud_staff_authorizations"],
    queryFn: async () => {
      const { data, error } = await supabaseCloud
        .from("staff_authorizations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as StaffAuth[];
    },
  });
}

function useUpgrades() {
  return useQuery<UpgradeRequest[]>({
    queryKey: ["cloud_upgrade_requests"],
    queryFn: async () => {
      const { data, error } = await supabaseCloud
        .from("upgrade_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as UpgradeRequest[];
    },
  });
}

function useWhmAlerts() {
  return useQuery<WhmAlert[]>({
    queryKey: ["cloud_whm_alerts"],
    queryFn: async () => {
      const { data, error } = await supabaseCloud
        .from("whm_quota_checks")
        .select("*")
        .or("is_over_80.eq.true,is_suspended.eq.true")
        .order("checked_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WhmAlert[];
    },
  });
}

/* ═══════════════════ TAB 1: TICKETS ═══════════════════ */
function TicketsTab() {
  const { data: tickets = [], isLoading, isError } = useTickets();
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const openDetail = (t: SupportTicket) => {
    setSelected(t);
    setEditStatus(t.status);
    setEditNotes(t.resolution_notes || "");
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabaseCloud
      .from("support_tickets")
      .update({ status: editStatus, resolution_notes: editNotes, updated_at: new Date().toISOString() })
      .eq("id", selected.id);
    setSaving(false);
    if (error) { toast.error("Failed to save"); return; }
    toast.success("Ticket updated");
    qc.invalidateQueries({ queryKey: ["cloud_support_tickets"] });
    setSelected(null);
  };

  if (isLoading) return <TableLoading />;
  if (isError) return <TableError message="Could not load tickets." />;
  if (tickets.length === 0) return <TableEmpty message="No support tickets yet." />;

  return (
    <>
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Subject</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Category</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Client</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Source</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tickets.map((t) => (
                <tr key={t.id} onClick={() => openDetail(t)} className="hover:bg-muted/20 cursor-pointer transition-colors">
                  <td className="px-4 py-3.5 font-medium text-foreground">{t.subject}</td>
                  <td className="px-4 py-3.5 hidden sm:table-cell"><StatusBadgeCustom label={t.category} colorMap={categoryColor} /></td>
                  <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell">{t.client_name || "—"}</td>
                  <td className="px-4 py-3.5"><StatusBadgeCustom label={t.status} colorMap={ticketStatusColor} /></td>
                  <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{t.source || "—"}</td>
                  <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{new Date(t.created_at).toLocaleDateString("en-ZA")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selected?.subject}</SheetTitle>
            <SheetDescription>Ticket details</SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Client:</span> <span className="font-medium">{selected.client_name || "—"}</span></div>
                <div><span className="text-muted-foreground">Category:</span> <StatusBadgeCustom label={selected.category} colorMap={categoryColor} /></div>
                <div><span className="text-muted-foreground">Source:</span> <span className="font-medium">{selected.source || "—"}</span></div>
                <div><span className="text-muted-foreground">Created:</span> <span className="font-medium">{new Date(selected.created_at).toLocaleDateString("en-ZA")}</span></div>
              </div>
              {selected.description && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Description</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{selected.description}</p>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Status</label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["open", "in_progress", "waiting_client", "resolved", "closed"].map((s) => (
                      <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Resolution notes</label>
                <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={4} />
              </div>
              <Button onClick={save} disabled={saving} className="w-full">{saving ? "Saving…" : "Save"}</Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

/* ═══════════════════ TAB 2: STAFF ACCESS ═══════════════════ */
function StaffAccessTab() {
  const { data: items = [], isLoading, isError } = useStaffAuths();
  const [selected, setSelected] = useState<StaffAuth | null>(null);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const updateStatus = async (id: string, status: string) => {
    setSaving(true);
    const { error } = await supabaseCloud.from("staff_authorizations").update({ status }).eq("id", id);
    setSaving(false);
    if (error) { toast.error("Failed to update"); return; }
    toast.success("Updated");
    qc.invalidateQueries({ queryKey: ["cloud_staff_authorizations"] });
    setSelected(null);
  };

  if (isLoading) return <TableLoading />;
  if (isError) return <TableError message="Could not load staff authorizations." />;
  if (items.length === 0) return <TableEmpty message="No staff access requests yet." />;

  return (
    <>
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Staff name</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Business</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Access</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((s) => {
                const accessTypes = [s.access_email && "Email", s.access_website && "Website", s.access_cpanel && "cPanel"].filter(Boolean).join(", ") || "—";
                return (
                  <tr key={s.id} onClick={() => setSelected(s)} className="hover:bg-muted/20 cursor-pointer transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-foreground">{s.staff_full_name}</p>
                      <p className="text-xs text-muted-foreground">{s.staff_email}</p>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell">{s.owner_name}</td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell">{accessTypes}</td>
                    <td className="px-4 py-3.5"><StatusBadgeCustom label={s.status} colorMap={staffStatusColor} /></td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{new Date(s.created_at).toLocaleDateString("en-ZA")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selected?.staff_full_name}</SheetTitle>
            <SheetDescription>Staff access details</SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{selected.staff_email}</span></div>
                <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{selected.staff_phone || "—"}</span></div>
                <div><span className="text-muted-foreground">Role:</span> <span className="font-medium">{selected.staff_role || "—"}</span></div>
                <div><span className="text-muted-foreground">Owner:</span> <span className="font-medium">{selected.owner_name}</span></div>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">Access:</p>
                <div className="flex gap-2 flex-wrap">
                  {selected.access_email && <Badge variant="secondary">Email</Badge>}
                  {selected.access_website && <Badge variant="secondary">Website</Badge>}
                  {selected.access_cpanel && <Badge variant="secondary">cPanel</Badge>}
                  {!selected.access_email && !selected.access_website && !selected.access_cpanel && <span className="text-muted-foreground">None</span>}
                </div>
              </div>
              <div><span className="text-muted-foreground text-sm">Status:</span> <StatusBadgeCustom label={selected.status} colorMap={staffStatusColor} /></div>
              <div className="flex gap-2">
                <Button onClick={() => updateStatus(selected.id, "credentials_sent")} disabled={saving || selected.status === "credentials_sent"} className="flex-1">
                  Mark as Credentials Sent
                </Button>
                <Button onClick={() => updateStatus(selected.id, "revoked")} disabled={saving || selected.status === "revoked"} variant="destructive" className="flex-1">
                  Revoke
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

/* ═══════════════════ TAB 3: UPGRADES ═══════════════════ */
function UpgradesTab() {
  const { data: items = [], isLoading, isError } = useUpgrades();
  const [selected, setSelected] = useState<UpgradeRequest | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [quoted, setQuoted] = useState("");
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const openDetail = (u: UpgradeRequest) => {
    setSelected(u);
    setEditStatus(u.status);
    setNotes("");
    setQuoted("");
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    // We'll store quoted_amount and internal_notes as part of a future column extension.
    // For now update status only since those columns don't exist yet.
    const { error } = await supabaseCloud
      .from("upgrade_requests")
      .update({ status: editStatus })
      .eq("id", selected.id);
    setSaving(false);
    if (error) { toast.error("Failed to save"); return; }
    toast.success("Upgrade request updated");
    qc.invalidateQueries({ queryKey: ["cloud_upgrade_requests"] });
    setSelected(null);
  };

  const platformLabel: Record<string, string> = {
    unknown: "Unknown", wysiwyg: "Old builder", mobirise: "Mobirise",
    wordpress: "WordPress", none: "No website",
  };

  if (isLoading) return <TableLoading />;
  if (isError) return <TableError message="Could not load upgrade requests." />;
  if (items.length === 0) return <TableEmpty message="No upgrade requests yet." />;

  return (
    <>
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Business</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Platform</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((u) => (
                <tr key={u.id} onClick={() => openDetail(u)} className="hover:bg-muted/20 cursor-pointer transition-colors">
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-foreground">{u.submitter_name}</p>
                    <p className="text-xs text-muted-foreground">{u.submitter_email}</p>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell">{platformLabel[u.current_platform] || u.current_platform}</td>
                  <td className="px-4 py-3.5"><StatusBadgeCustom label={u.status} colorMap={upgradeStatusColor} /></td>
                  <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{new Date(u.created_at).toLocaleDateString("en-ZA")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Upgrade Request</SheetTitle>
            <SheetDescription>{selected?.submitter_name} — {selected?.submitter_email}</SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="space-y-4 mt-4">
              <div className="text-sm space-y-2">
                <div><span className="text-muted-foreground">Business description:</span><p className="font-medium whitespace-pre-wrap mt-0.5">{selected.business_description}</p></div>
                {selected.current_website_url && <div><span className="text-muted-foreground">Current website:</span> <a href={selected.current_website_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">{selected.current_website_url}</a></div>}
                <div><span className="text-muted-foreground">Platform:</span> <span className="font-medium">{platformLabel[selected.current_platform] || selected.current_platform}</span></div>
                {selected.goals && <div><span className="text-muted-foreground">Goals:</span><p className="font-medium whitespace-pre-wrap mt-0.5">{selected.goals}</p></div>}
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Quoted amount</label>
                <Input placeholder="e.g. R4,500" value={quoted} onChange={(e) => setQuoted(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Internal notes</label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Status</label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["new", "contacted", "quoted", "accepted", "declined", "in_progress", "completed"].map((s) => (
                      <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={save} disabled={saving} className="w-full">{saving ? "Saving…" : "Save"}</Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

/* ═══════════════════ TAB 4: WHM ALERTS ═══════════════════ */
function WhmAlertsTab() {
  const { data: items = [], isLoading, isError } = useWhmAlerts();

  if (isLoading) return <TableLoading />;
  if (isError) return <TableError message="Could not load WHM alerts." />;
  if (items.length === 0) return <TableEmpty message="No quota alerts — everything looks good!" />;

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Domain</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Usage</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Alert</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Checked</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((a) => {
              const rowBg = a.is_suspended
                ? "bg-destructive/5"
                : a.usage_percent > 90
                ? "bg-orange-50"
                : "bg-yellow-50/50";

              const barColor = a.is_suspended
                ? "[&>div]:bg-destructive"
                : a.usage_percent > 90
                ? "[&>div]:bg-orange-500"
                : "[&>div]:bg-yellow-500";

              return (
                <tr key={a.id} className={cn(rowBg, "transition-colors")}>
                  <td className="px-4 py-3.5 font-medium text-foreground">{a.domain}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(a.usage_percent, 100)} className={cn("h-2 w-24", barColor)} />
                      <span className="text-xs font-medium">{a.usage_percent}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    {a.is_suspended ? (
                      <Badge variant="destructive">Suspended</Badge>
                    ) : (
                      <Badge variant="outline" className="border-warning text-warning">Over 80%</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{new Date(a.checked_at).toLocaleDateString("en-ZA")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════ MAIN PAGE ═══════════════════ */
const Support = () => {
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">Support</h1>
          <p className="text-sm text-muted-foreground mt-1">Client requests and issues</p>
        </div>

        <Tabs defaultValue="tickets">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="tickets">Tickets</TabsTrigger>
            <TabsTrigger value="staff">Staff Access</TabsTrigger>
            <TabsTrigger value="upgrades">Upgrades</TabsTrigger>
            <TabsTrigger value="whm">WHM Alerts</TabsTrigger>
          </TabsList>
          <TabsContent value="tickets" className="mt-4">
            <TicketsTab />
          </TabsContent>
          <TabsContent value="staff" className="mt-4">
            <StaffAccessTab />
          </TabsContent>
          <TabsContent value="upgrades" className="mt-4">
            <UpgradesTab />
          </TabsContent>
          <TabsContent value="whm" className="mt-4">
            <WhmAlertsTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Support;
