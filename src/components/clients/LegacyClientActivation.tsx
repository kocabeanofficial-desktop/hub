import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { History, Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useClientsList } from "@/hooks/useClients";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import type { DbClient, DbProject } from "@/types/database";

const LEGACY_SERVICE_TYPES = [
  "domain_only",
  "email_only",
  "domain_and_email",
  "hosting_only",
  "website_management",
  "website_hosting_email",
  "other",
] as const;

const SERVICE_STATUS_OPTIONS = ["active", "pending_confirmation", "suspended", "cancelled"] as const;
const BILLING_STATUS_OPTIONS = [
  "active",
  "needs_invoice_setup",
  "needs_pricing_confirmation",
  "legacy_pricing",
  "cancelled",
] as const;

const AUDIT_NOTE =
  "Legacy client activated in KBCC. Previous website service discontinued/sold. Domain/email retained as active service.";

const serviceTypeLabel = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const serviceCodeFor = (serviceType: string) => `legacy_${serviceType}`;

const defaultProjectName = (clientName: string, serviceType: string) => {
  if (serviceType === "domain_only") return `Domain Service - ${clientName}`;
  if (serviceType === "email_only") return `Email Service - ${clientName}`;
  if (["hosting_only", "website_management", "website_hosting_email"].includes(serviceType)) {
    return `Managed Service - ${clientName}`;
  }
  return `Domain & Email Service - ${clientName}`;
};

const needsDomain = (serviceType: string) =>
  ["domain_only", "domain_and_email", "website_hosting_email"].includes(serviceType);

const needsMailbox = (serviceType: string) =>
  ["email_only", "domain_and_email", "website_hosting_email"].includes(serviceType);

const needsHosting = (serviceType: string) =>
  ["hosting_only", "website_management", "website_hosting_email"].includes(serviceType);

export function LegacyClientActivation({
  client,
  projects,
}: {
  client: DbClient;
  projects: DbProject[];
}) {
  const queryClient = useQueryClient();
  const { data: clients = [] } = useClientsList();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serviceType, setServiceType] = useState("domain_and_email");
  const [serviceStatus, setServiceStatus] = useState("active");
  const [billingStatus, setBillingStatus] = useState("needs_invoice_setup");
  const [previousNotes, setPreviousNotes] = useState("");
  const [domainName, setDomainName] = useState("");
  const [mailboxes, setMailboxes] = useState([""]);
  const [hostingLabel, setHostingLabel] = useState("");
  const [internalNotes, setInternalNotes] = useState(AUDIT_NOTE);
  const [relatedClientId, setRelatedClientId] = useState("");
  const [billingOwnerId, setBillingOwnerId] = useState("");
  const [operationalContactId, setOperationalContactId] = useState("");
  const [projectMode, setProjectMode] = useState("create");
  const [projectName, setProjectName] = useState(defaultProjectName(client.business_name, "domain_and_email"));

  const selectableClients = useMemo(
    () => clients.filter((item) => item.id !== client.id),
    [clients, client.id],
  );

  const reset = () => {
    setServiceType("domain_and_email");
    setServiceStatus("active");
    setBillingStatus("needs_invoice_setup");
    setPreviousNotes("");
    setDomainName("");
    setMailboxes([""]);
    setHostingLabel("");
    setInternalNotes(AUDIT_NOTE);
    setRelatedClientId("");
    setBillingOwnerId("");
    setOperationalContactId("");
    setProjectMode("create");
    setProjectName(defaultProjectName(client.business_name, "domain_and_email"));
  };

  const updateServiceType = (value: string) => {
    setServiceType(value);
    setProjectName(defaultProjectName(client.business_name, value));
  };

  const addMailboxRow = () => setMailboxes((current) => [...current, ""]);
  const updateMailbox = (index: number, value: string) =>
    setMailboxes((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  const removeMailbox = (index: number) =>
    setMailboxes((current) => current.filter((_, itemIndex) => itemIndex !== index));

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["client", client.id] });
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    queryClient.invalidateQueries({ queryKey: ["clients", "by-business-name"] });
    queryClient.invalidateQueries({ queryKey: ["domains", client.id] });
    queryClient.invalidateQueries({ queryKey: ["domains"] });
    queryClient.invalidateQueries({ queryKey: ["mailboxes", client.id] });
    queryClient.invalidateQueries({ queryKey: ["mailboxes"] });
    queryClient.invalidateQueries({ queryKey: ["hosting_accounts", client.id] });
    queryClient.invalidateQueries({ queryKey: ["hosting_accounts"] });
    queryClient.invalidateQueries({ queryKey: ["client_services", client.id] });
    queryClient.invalidateQueries({ queryKey: ["projects", client.id] });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    queryClient.invalidateQueries({ queryKey: ["client_relationships", client.id] });
  };

  const migrationStatus = () => {
    const trimmedDomain = domainName.trim();
    const cleanMailboxes = mailboxes.map((item) => item.trim()).filter(Boolean);
    if (needsDomain(serviceType) && !trimmedDomain) return "partially_captured";
    if (needsMailbox(serviceType) && cleanMailboxes.length === 0) return "partially_captured";
    if (needsHosting(serviceType) && !hostingLabel.trim()) return "partially_captured";
    return "activated";
  };

  const upsertDomain = async (hostingAccountId: string | null) => {
    const value = domainName.trim().toLowerCase();
    if (!value) return null;

    const { data: existing, error: findError } = await supabase
      .from("domains")
      .select("id")
      .eq("client_id", client.id)
      .eq("domain_name", value)
      .maybeSingle();
    if (findError) throw findError;

    const payload = {
      client_id: client.id,
      domain_name: value,
      tld: value.includes(".") ? `.${value.split(".").pop()}` : null,
      status: serviceStatus,
      hosting_account_id: hostingAccountId,
      notes: [previousNotes.trim(), internalNotes.trim()].filter(Boolean).join("\n\n") || null,
    };

    if (existing?.id) {
      const { error } = await supabase.from("domains").update(payload).eq("id", existing.id);
      if (error) throw error;
      return existing.id as string;
    }

    const { data: created, error } = await supabase.from("domains").insert(payload).select("id").single();
    if (error) throw error;
    return created.id as string;
  };

  const upsertHostingAccount = async () => {
    const label = hostingLabel.trim();
    if (!label) return null;

    const { data: existing, error: findError } = await supabase
      .from("hosting_accounts")
      .select("id")
      .eq("client_id", client.id)
      .eq("cpanel_username", label)
      .maybeSingle();
    if (findError) throw findError;

    const payload = {
      client_id: client.id,
      cpanel_username: label,
      status: serviceStatus,
      notes: [previousNotes.trim(), internalNotes.trim()].filter(Boolean).join("\n\n") || null,
    };

    if (existing?.id) {
      const { error } = await supabase.from("hosting_accounts").update(payload).eq("id", existing.id);
      if (error) throw error;
      return existing.id as string;
    }

    const { data: created, error } = await supabase.from("hosting_accounts").insert(payload).select("id").single();
    if (error) throw error;
    return created.id as string;
  };

  const upsertMailboxes = async (hostingAccountId: string | null) => {
    const cleanMailboxes = mailboxes.map((item) => item.trim().toLowerCase()).filter(Boolean);
    for (const email of cleanMailboxes) {
      const { data: existing, error: findError } = await supabase
        .from("mailboxes")
        .select("id")
        .eq("client_id", client.id)
        .eq("email_address", email)
        .maybeSingle();
      if (findError) throw findError;

      const payload = {
        client_id: client.id,
        email_address: email,
        status: serviceStatus,
        hosting_account_id: hostingAccountId,
        notes: [billingStatus, internalNotes.trim()].filter(Boolean).join(" - "),
      };

      const { error } = existing?.id
        ? await supabase.from("mailboxes").update(payload).eq("id", existing.id)
        : await supabase.from("mailboxes").insert(payload);
      if (error) throw error;
    }
  };

  const upsertService = async () => {
    const serviceCode = serviceCodeFor(serviceType);
    const { data: existing, error: findError } = await supabase
      .from("client_services")
      .select("id")
      .eq("client_id", client.id)
      .eq("service_code", serviceCode)
      .maybeSingle();
    if (findError) throw findError;

    const payload = {
      client_id: client.id,
      service_code: serviceCode,
      status: serviceStatus === "cancelled" ? "cancelled" : "active",
      is_active: serviceStatus === "active" || serviceStatus === "pending_confirmation",
      billing_cycle: billingStatus === "cancelled" ? null : "legacy",
      notes: [
        serviceTypeLabel(serviceType),
        `Current service status: ${serviceTypeLabel(serviceStatus)}`,
        `Billing status: ${serviceTypeLabel(billingStatus)}`,
        previousNotes.trim(),
        internalNotes.trim(),
      ].filter(Boolean).join("\n"),
    };

    const { error } = existing?.id
      ? await supabase.from("client_services").update(payload).eq("id", existing.id)
      : await supabase.from("client_services").insert(payload);
    if (error) throw error;
  };

  const saveProjectRecord = async () => {
    const payload = {
      client_id: client.id,
      project_name: projectName.trim() || defaultProjectName(client.business_name, serviceType),
      project_type: ["domain_only", "email_only", "domain_and_email"].includes(serviceType) ? "maintenance" : "other",
      stage: serviceStatus === "active" ? "completed" : "on_hold",
      priority: "medium",
      internal_notes: [
        internalNotes.trim(),
        previousNotes.trim() ? `Previous service notes: ${previousNotes.trim()}` : "",
      ].filter(Boolean).join("\n\n") || null,
    };

    if (projectMode !== "create") {
      const { error } = await supabase.from("projects").update(payload).eq("id", projectMode);
      if (error) throw error;
      return;
    }

    const { error } = await supabase.from("projects").insert(payload);
    if (error) throw error;
  };

  const insertRelationship = async (relatedClientId: string, relationshipType: string, note: string) => {
    if (!relatedClientId) return;
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("client_relationships").insert({
      source_client_id: client.id,
      related_client_id: relatedClientId,
      relationship_type: relationshipType,
      notes: note,
      created_by: userData.user?.id ?? null,
    });

    if (error && error.code !== "23505") throw error;
  };

  const saveAuditNote = async () => {
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from("client_history_notes").insert({
      client_id: client.id,
      note_type: "legacy_activation",
      note: [
        AUDIT_NOTE,
        `Legacy service type: ${serviceTypeLabel(serviceType)}`,
        previousNotes.trim() ? `Previous notes: ${previousNotes.trim()}` : "",
        internalNotes.trim() && internalNotes.trim() !== AUDIT_NOTE ? `Internal notes: ${internalNotes.trim()}` : "",
      ].filter(Boolean).join("\n"),
      created_by: userData.user?.id ?? null,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const status = migrationStatus();
      const existingNotes = client.notes?.trim();
      const updatedNotes = [existingNotes, AUDIT_NOTE].filter(Boolean).join("\n\n");

      const { error: clientError } = await supabase
        .from("clients")
        .update({
          client_origin: "legacy_client",
          migration_status: status,
          status: "active",
          notes: updatedNotes,
        })
        .eq("id", client.id);
      if (clientError) throw clientError;

      const hostingAccountId = await upsertHostingAccount();
      await upsertDomain(hostingAccountId);
      await upsertMailboxes(hostingAccountId);
      await upsertService();
      await saveProjectRecord();
      await insertRelationship(relatedClientId, "previous_service_link", "Linked during legacy client activation.");
      await insertRelationship(billingOwnerId, "billing_contact", "Billing owner selected during legacy client activation.");
      await insertRelationship(operationalContactId, "admin_contact", "Operational contact selected during legacy client activation.");
      await saveAuditNote();

      toast({ title: "Legacy client activated", description: `${client.business_name} is now marked as ${status.replace(/_/g, " ")}.` });
      refresh();
      setOpen(false);
      reset();
    } catch (error) {
      toast({
        title: "Legacy activation failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-heading font-semibold text-foreground">Legacy Client Activation</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Capture existing domain, email, hosting, and service records without treating this as a new intake.
          </p>
          <div className="flex gap-2 mt-3 flex-wrap text-xs">
            <span className="rounded-full border border-border px-2 py-1 text-muted-foreground">
              Origin: {client.client_origin?.replace(/_/g, " ") || "new intake"}
            </span>
            <span className="rounded-full border border-border px-2 py-1 text-muted-foreground">
              Migration: {client.migration_status?.replace(/_/g, " ") || "not required"}
            </span>
          </div>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
          <History className="h-3.5 w-3.5" /> Activate Legacy Client
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) reset(); }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Activate Legacy Client</DialogTitle>
            <DialogDescription>
              This updates the client origin, creates active service records, and preserves the original intake data.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            <div className="grid sm:grid-cols-3 gap-4">
              <SelectField label="Legacy service type" value={serviceType} onChange={updateServiceType} options={LEGACY_SERVICE_TYPES} />
              <SelectField label="Current service status" value={serviceStatus} onChange={setServiceStatus} options={SERVICE_STATUS_OPTIONS} />
              <SelectField label="Billing status" value={billingStatus} onChange={setBillingStatus} options={BILLING_STATUS_OPTIONS} />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>Domain name</Label>
                <Input value={domainName} onChange={(event) => setDomainName(event.target.value)} placeholder="example.co.za" />
              </div>
              <div className="grid gap-1.5">
                <Label>Hosting account label</Label>
                <Input value={hostingLabel} onChange={(event) => setHostingLabel(event.target.value)} placeholder="Optional account label" />
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Mailboxes</Label>
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addMailboxRow}>
                  <Plus className="h-3.5 w-3.5" /> Add Row
                </Button>
              </div>
              {mailboxes.map((mailbox, index) => (
                <div key={index} className="flex gap-2">
                  <Input value={mailbox} onChange={(event) => updateMailbox(index, event.target.value)} placeholder="info@example.co.za" />
                  {mailboxes.length > 1 && (
                    <Button type="button" variant="outline" size="icon" onClick={() => removeMailbox(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <ClientSelect label="Existing related client/contact" value={relatedClientId} onChange={setRelatedClientId} clients={selectableClients} />
              <ClientSelect label="Billing owner" value={billingOwnerId} onChange={setBillingOwnerId} clients={selectableClients} />
              <ClientSelect label="Operational contact" value={operationalContactId} onChange={setOperationalContactId} clients={selectableClients} />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>Service/project record</Label>
                <Select value={projectMode} onValueChange={setProjectMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="create">Create new service/project record</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        Rename/update: {project.project_name || "Untitled project"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Project/service name</Label>
                <Input value={projectName} onChange={(event) => setProjectName(event.target.value)} />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Previous service notes</Label>
              <Textarea value={previousNotes} onChange={(event) => setPreviousNotes(event.target.value)} rows={3} />
            </div>
            <div className="grid gap-1.5">
              <Label>Internal notes</Label>
              <Textarea value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} rows={4} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Save Legacy Activation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>{serviceTypeLabel(option)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ClientSelect({
  label,
  value,
  onChange,
  clients,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  clients: DbClient[];
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
        <SelectContent>
          {clients.map((client) => (
            <SelectItem key={client.id} value={client.id}>{client.business_name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
