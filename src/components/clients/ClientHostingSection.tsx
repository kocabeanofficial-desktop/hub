import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Globe, Loader2, Mail, Plus, Server } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
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
import { toast } from "@/hooks/use-toast";
import { useClientDomains, useClientHostingAccounts, useClientMailboxes } from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";

const sslBadgeColors: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  expired: "bg-destructive/10 text-destructive border-destructive/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  none: "bg-muted text-muted-foreground border-border",
};

const SslPill = ({ status }: { status: string | null }) => {
  const normalized = status || "none";
  const style = sslBadgeColors[normalized] || sslBadgeColors.none;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      {normalized.replace(/^\w/, (char) => char.toUpperCase())}
    </span>
  );
};

export const ClientHostingSection = ({ clientId }: { clientId: string }) => {
  const { data: accounts = [], isLoading: loadingAccounts } = useClientHostingAccounts(clientId);
  const { data: domains = [], isLoading: loadingDomains } = useClientDomains(clientId);
  const { data: mailboxes = [], isLoading: loadingMailboxes } = useClientMailboxes(clientId);
  const queryClient = useQueryClient();

  const [domainDialog, setDomainDialog] = useState(false);
  const [mailboxDialog, setMailboxDialog] = useState(false);
  const [hostingDialog, setHostingDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const [domainName, setDomainName] = useState("");
  const [domainTld, setDomainTld] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [cpanelUsername, setCpanelUsername] = useState("");

  const handleAddDomain = async () => {
    if (!domainName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("domains").insert({
      client_id: clientId,
      domain_name: domainName.trim(),
      tld: domainTld.trim() || null,
      status: "pending",
    });
    setSaving(false);

    if (error) {
      toast({ title: "Failed to add domain", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Domain added" });
    queryClient.invalidateQueries({ queryKey: ["domains", clientId] });
    queryClient.invalidateQueries({ queryKey: ["domains"] });
    setDomainDialog(false);
    setDomainName("");
    setDomainTld("");
  };

  const handleAddMailbox = async () => {
    if (!emailAddress.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("mailboxes").insert({
      client_id: clientId,
      email_address: emailAddress.trim(),
      status: "pending",
    });
    setSaving(false);

    if (error) {
      toast({ title: "Failed to add mailbox", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Mailbox added" });
    queryClient.invalidateQueries({ queryKey: ["mailboxes", clientId] });
    queryClient.invalidateQueries({ queryKey: ["mailboxes"] });
    setMailboxDialog(false);
    setEmailAddress("");
  };

  const handleAddHosting = async () => {
    setSaving(true);
    const { error } = await supabase.from("hosting_accounts").insert({
      client_id: clientId,
      cpanel_username: cpanelUsername.trim() || null,
      status: "pending",
    });
    setSaving(false);

    if (error) {
      toast({ title: "Failed to add hosting account", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Hosting account added" });
    queryClient.invalidateQueries({ queryKey: ["hosting_accounts", clientId] });
    queryClient.invalidateQueries({ queryKey: ["hosting_accounts"] });
    setHostingDialog(false);
    setCpanelUsername("");
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl border border-border shadow-sm">
        <div className="px-4 py-3.5 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-heading font-bold text-foreground flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" /> Domains ({domains.length})
          </h3>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDomainDialog(true)}>
            <Plus className="h-3.5 w-3.5" /> Add Domain
          </Button>
        </div>

        {loadingDomains ? (
          <div className="px-4 py-8 text-center">
            <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {domains.length === 0 && (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">No domains.</p>
            )}
            {domains.map((domain) => (
              <div key={domain.id} className="px-4 py-3.5 flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">{domain.domain_name}</p>
                  {domain.registrar && <p className="text-xs text-muted-foreground mt-0.5">{domain.registrar}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <SslPill status={domain.ssl_status} />
                  <StatusBadge status={domain.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm">
        <div className="px-4 py-3.5 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-heading font-bold text-foreground flex items-center gap-2">
            <Server className="h-4 w-4 text-muted-foreground" /> Hosting Accounts ({accounts.length})
          </h3>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setHostingDialog(true)}>
            <Plus className="h-3.5 w-3.5" /> Add Account
          </Button>
        </div>

        {loadingAccounts ? (
          <div className="px-4 py-8 text-center">
            <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {accounts.length === 0 && (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">No hosting accounts.</p>
            )}
            {accounts.map((account) => (
              <div key={account.id} className="px-4 py-3.5 flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">{account.cpanel_username || "Hosting account"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {[account.server, account.ip_address].filter(Boolean).join(" / ") || "No server or IP set"}
                  </p>
                </div>
                <StatusBadge status={account.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm">
        <div className="px-4 py-3.5 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-heading font-bold text-foreground flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" /> Mailboxes ({mailboxes.length})
          </h3>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setMailboxDialog(true)}>
            <Plus className="h-3.5 w-3.5" /> Add Mailbox
          </Button>
        </div>

        {loadingMailboxes ? (
          <div className="px-4 py-8 text-center">
            <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {mailboxes.length === 0 && (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">No mailboxes.</p>
            )}
            {mailboxes.map((mailbox) => (
              <div key={mailbox.id} className="px-4 py-3.5 flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">{mailbox.email_address}</p>
                  {mailbox.notes && <p className="text-xs text-muted-foreground mt-0.5">{mailbox.notes}</p>}
                </div>
                <StatusBadge status={mailbox.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={domainDialog} onOpenChange={setDomainDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Domain</DialogTitle>
            <DialogDescription>Add a domain for this client.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label>Domain name *</Label>
              <Input value={domainName} onChange={(event) => setDomainName(event.target.value)} placeholder="example.co.za" />
            </div>
            <div className="grid gap-1.5">
              <Label>TLD</Label>
              <Input value={domainTld} onChange={(event) => setDomainTld(event.target.value)} placeholder=".co.za" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddDomain} disabled={saving || !domainName.trim()} size="sm">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Add Domain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mailboxDialog} onOpenChange={setMailboxDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Mailbox</DialogTitle>
            <DialogDescription>Add an email mailbox for this client.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label>Email address *</Label>
              <Input value={emailAddress} onChange={(event) => setEmailAddress(event.target.value)} placeholder="info@example.co.za" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddMailbox} disabled={saving || !emailAddress.trim()} size="sm">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Add Mailbox
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={hostingDialog} onOpenChange={setHostingDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Hosting Account</DialogTitle>
            <DialogDescription>Create a new hosting account for this client.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label>cPanel username</Label>
              <Input value={cpanelUsername} onChange={(event) => setCpanelUsername(event.target.value)} placeholder="username" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddHosting} disabled={saving} size="sm">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Add Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
