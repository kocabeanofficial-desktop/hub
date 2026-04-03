import { useState } from "react";
import { useClientHostingAccounts, useClientDomains, useClientMailboxes } from "@/hooks/useSupabaseData";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Plus, Loader2, Globe, Mail, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

const sslBadgeColors: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  expired: "bg-destructive/10 text-destructive border-destructive/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  none: "bg-muted text-muted-foreground border-border",
};

const SslPill = ({ status }: { status: string | null }) => {
  const s = status || "none";
  const style = sslBadgeColors[s] || sslBadgeColors.none;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${style}`}>{s.replace(/^\w/, c => c.toUpperCase())}</span>;
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
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
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
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
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
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Hosting account added" });
    queryClient.invalidateQueries({ queryKey: ["hosting_accounts", clientId] });
    queryClient.invalidateQueries({ queryKey: ["hosting_accounts"] });
    setHostingDialog(false);
    setCpanelUsername("");
  };

  const isLoading = loadingAccounts || loadingDomains || loadingMailboxes;

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl border border-border shadow-sm">
        <div className="px-4 py-3.5 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-heading font-bold text-foreground flex items-center gap-2">
            <Server className="h-4 w-4 text-muted-foreground" /> Hosting & Infrastructure
          </h3>
        </div>

        {isLoading ? (
          <div className="px-4 py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" /></div>
        ) : (
          <div className="divide-y divide-border">
            {/* Hosting Accounts */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hosting Accounts ({accounts.length})</p>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setHostingDialog(true)}>
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>
              {accounts.length === 0 && <p className="text-sm text-muted-foreground py-2">No hosting accounts.</p>}
              {accounts.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-foreground">{a.cpanel_username || "Account"} {a.package ? `· ${a.package}` : ""}</span>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>

            {/* Domains */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" /> Domains ({domains.length})
                </p>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setDomainDialog(true)}>
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>
              {domains.length === 0 && <p className="text-sm text-muted-foreground py-2">No domains.</p>}
              {domains.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-foreground">{d.domain_name}</span>
                  <div className="flex items-center gap-2">
                    <SslPill status={d.ssl_status} />
                    <StatusBadge status={d.status} />
                  </div>
                </div>
              ))}
            </div>

            {/* Mailboxes */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> Mailboxes ({mailboxes.length})
                </p>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setMailboxDialog(true)}>
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>
              {mailboxes.length === 0 && <p className="text-sm text-muted-foreground py-2">No mailboxes.</p>}
              {mailboxes.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-foreground">{m.email_address}</span>
                  <StatusBadge status={m.status} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Domain Dialog */}
      <Dialog open={domainDialog} onOpenChange={setDomainDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Domain</DialogTitle>
            <DialogDescription>Add a domain for this client.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5"><Label>Domain name *</Label><Input value={domainName} onChange={(e) => setDomainName(e.target.value)} placeholder="example.co.za" /></div>
            <div className="grid gap-1.5"><Label>TLD</Label><Input value={domainTld} onChange={(e) => setDomainTld(e.target.value)} placeholder=".co.za" /></div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddDomain} disabled={saving || !domainName.trim()} size="sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Add Domain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Mailbox Dialog */}
      <Dialog open={mailboxDialog} onOpenChange={setMailboxDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Mailbox</DialogTitle>
            <DialogDescription>Add an email mailbox for this client.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5"><Label>Email address *</Label><Input value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} placeholder="info@example.co.za" /></div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddMailbox} disabled={saving || !emailAddress.trim()} size="sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Add Mailbox
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Hosting Dialog */}
      <Dialog open={hostingDialog} onOpenChange={setHostingDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Hosting Account</DialogTitle>
            <DialogDescription>Create a new hosting account for this client.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5"><Label>cPanel username</Label><Input value={cpanelUsername} onChange={(e) => setCpanelUsername(e.target.value)} placeholder="username" /></div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddHosting} disabled={saving} size="sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Add Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
