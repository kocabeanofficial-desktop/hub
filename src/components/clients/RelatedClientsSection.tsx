import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, Link2, Loader2, Plus, UserPlus } from "lucide-react";
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
import type { DbClient, DbClientRelationship } from "@/types/database";

export const RELATIONSHIP_TYPES = [
  "same_owner",
  "billing_contact",
  "referral",
  "managed_by",
  "previous_service_link",
  "sold_business",
  "associated_business",
  "admin_contact",
  "other",
] as const;

const relationshipLabel = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

type RelationshipRow = DbClientRelationship & {
  otherClient: DbClient | null;
  direction: "outbound" | "inbound";
};

async function insertRelationship(input: {
  sourceClientId: string;
  relatedClientId: string;
  relationshipType: string;
  notes: string | null;
}) {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from("client_relationships").insert({
    source_client_id: input.sourceClientId,
    related_client_id: input.relatedClientId,
    relationship_type: input.relationshipType,
    notes: input.notes,
    created_by: userData.user?.id ?? null,
  });
  if (error) throw error;
}

export function RelatedClientsSection({ client }: { client: DbClient }) {
  const queryClient = useQueryClient();
  const { data: clients = [] } = useClientsList();
  const [linkOpen, setLinkOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [relationshipType, setRelationshipType] = useState("associated_business");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");

  const relationshipsQuery = useQuery({
    queryKey: ["client_relationships", client.id],
    queryFn: async () => {
      const { data: relationships, error } = await supabase
        .from("client_relationships")
        .select("*")
        .or(`source_client_id.eq.${client.id},related_client_id.eq.${client.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const rows = (relationships ?? []) as DbClientRelationship[];
      const relatedIds = Array.from(
        new Set(
          rows.map((row) =>
            row.source_client_id === client.id ? row.related_client_id : row.source_client_id,
          ),
        ),
      );

      const { data: relatedClients, error: clientError } = relatedIds.length
        ? await supabase.from("clients").select("*").in("id", relatedIds)
        : { data: [], error: null };
      if (clientError) throw clientError;

      const byId = new Map((relatedClients ?? []).map((item) => [item.id, item as DbClient]));
      return rows.map((row) => ({
        ...row,
        direction: row.source_client_id === client.id ? "outbound" : "inbound",
        otherClient: byId.get(row.source_client_id === client.id ? row.related_client_id : row.source_client_id) ?? null,
      })) as RelationshipRow[];
    },
  });

  const selectableClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    return clients
      .filter((item) => item.id !== client.id)
      .filter((item) => {
        if (!term) return true;
        return [item.business_name, item.trading_name, item.email, item.phone]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      })
      .slice(0, 20);
  }, [clients, client.id, search]);

  const reset = () => {
    setSelectedClientId("");
    setRelationshipType("associated_business");
    setNotes("");
    setSearch("");
    setNewClientName("");
    setNewClientEmail("");
    setNewClientPhone("");
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["client_relationships", client.id] });
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    queryClient.invalidateQueries({ queryKey: ["clients", "by-business-name"] });
  };

  const handleLinkExisting = async () => {
    if (!selectedClientId) return;
    setSaving(true);
    try {
      await insertRelationship({
        sourceClientId: client.id,
        relatedClientId: selectedClientId,
        relationshipType,
        notes: notes.trim() || null,
      });
      toast({ title: "Client linked" });
      refresh();
      setLinkOpen(false);
      reset();
    } catch (error) {
      toast({
        title: "Failed to link client",
        description: error instanceof Error ? error.message : "Duplicate or invalid relationship.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAndLink = async () => {
    if (!newClientName.trim()) return;
    setSaving(true);
    try {
      const { data: created, error } = await supabase
        .from("clients")
        .insert({
          business_name: newClientName.trim(),
          email: newClientEmail.trim() || null,
          phone: newClientPhone.trim() || null,
          status: "active",
          client_origin: "manual_capture",
          migration_status: "not_required",
        })
        .select("*")
        .single();
      if (error) throw error;

      await insertRelationship({
        sourceClientId: client.id,
        relatedClientId: created.id,
        relationshipType,
        notes: notes.trim() || null,
      });
      toast({ title: "Client created and linked" });
      refresh();
      setCreateOpen(false);
      reset();
    } catch (error) {
      toast({
        title: "Failed to create linked client",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <h2 className="text-base font-heading font-semibold text-foreground">Related Clients</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Link separate client records without merging accounts or overwriting intake data.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setLinkOpen(true)}>
            <Link2 className="h-3.5 w-3.5" /> Link Existing Client
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-3.5 w-3.5" /> Create & Link New Client
          </Button>
        </div>
      </div>

      {relationshipsQuery.isLoading && (
        <div className="px-4 py-8 text-center">
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
        </div>
      )}

      {!relationshipsQuery.isLoading && (relationshipsQuery.data?.length ?? 0) === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm font-medium text-foreground">No related clients yet</p>
          <p className="text-xs text-muted-foreground mt-1">Linked accounts will appear on both client detail pages.</p>
        </div>
      )}

      {!relationshipsQuery.isLoading && (relationshipsQuery.data?.length ?? 0) > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {relationshipsQuery.data?.map((relationship) => (
            <li key={relationship.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {relationship.otherClient?.business_name || "Unknown client"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {relationshipLabel(relationship.relationship_type)}
                  {relationship.direction === "inbound" ? " to this client" : ""}
                </p>
                {relationship.notes && (
                  <p className="text-xs text-muted-foreground mt-1 truncate max-w-2xl">{relationship.notes}</p>
                )}
              </div>
              {relationship.otherClient && (
                <Button asChild size="sm" variant="outline">
                  <Link to={`/admin/clients/${relationship.otherClient.id}`}>
                    Open <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Link>
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={linkOpen} onOpenChange={(open) => { setLinkOpen(open); if (!open) reset(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Link Existing Client</DialogTitle>
            <DialogDescription>Choose an existing client record and describe how it relates to this one.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Search clients</Label>
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by business, email, or phone" />
            </div>
            <div className="grid gap-1.5">
              <Label>Existing client *</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger>
                <SelectContent>
                  {selectableClients.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.business_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <RelationshipFields relationshipType={relationshipType} setRelationshipType={setRelationshipType} notes={notes} setNotes={setNotes} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleLinkExisting} disabled={saving || !selectedClientId}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Link Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) reset(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create & Link New Client</DialogTitle>
            <DialogDescription>Create a separate client record, then link it back to this account.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Business / client name *</Label>
              <Input value={newClientName} onChange={(event) => setNewClientName(event.target.value)} placeholder="Rejuvaskin (PTY) Ltd" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>Email</Label>
                <Input type="email" value={newClientEmail} onChange={(event) => setNewClientEmail(event.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Phone</Label>
                <Input value={newClientPhone} onChange={(event) => setNewClientPhone(event.target.value)} />
              </div>
            </div>
            <RelationshipFields relationshipType={relationshipType} setRelationshipType={setRelationshipType} notes={notes} setNotes={setNotes} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleCreateAndLink} disabled={saving || !newClientName.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Create & Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function RelationshipFields({
  relationshipType,
  setRelationshipType,
  notes,
  setNotes,
}: {
  relationshipType: string;
  setRelationshipType: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
}) {
  return (
    <>
      <div className="grid gap-1.5">
        <Label>Relationship type</Label>
        <Select value={relationshipType} onValueChange={setRelationshipType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {RELATIONSHIP_TYPES.map((type) => (
              <SelectItem key={type} value={type}>{relationshipLabel(type)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label>Internal notes</Label>
        <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Optional relationship notes..." />
      </div>
    </>
  );
}
