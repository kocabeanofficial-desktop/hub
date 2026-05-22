import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, PauseCircle, Plus } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useClientServices, useServices } from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";
import type { DbService } from "@/types/database";

interface Props {
  clientId: string;
}

const DEFAULT_BILLING_CYCLE = "monthly";
const CURRENT_SERVICE_CODES = new Set([
  "business_email",
  "business_email_10",
  "business_email_30",
  "business_email_50",
  "email_migration",
  "email_migration_setup",
  "smart_website",
  "website_build",
  "website_redesign",
  "smart_ecommerce",
  "ecommerce_build",
  "smart_system",
  "advanced_web_system",
  "custom_web_app",
  "existing_client_support",
  "support_request",
  "billing_request",
  "general_enquiry",
  "seo",
  "seo_management",
]);

export const ClientServicesSection = ({ clientId }: Props) => {
  const { data: clientServices = [], isLoading } = useClientServices(clientId);
  const { data: services = [] } = useServices();
  const [open, setOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState("");
  const [billingCycle, setBillingCycle] = useState(DEFAULT_BILLING_CYCLE);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [pausingId, setPausingId] = useState<string | null>(null);
  const qc = useQueryClient();

  const activeClientServices = clientServices.filter(
    (clientService) => clientService.is_active && clientService.status === "active",
  );
  const activeServiceCodes = new Set(activeClientServices.map((clientService) => clientService.service_code));
  const inactiveByServiceCode = clientServices.reduce((map, clientService) => {
    if ((!clientService.is_active || clientService.status !== "active") && !map.has(clientService.service_code)) {
      map.set(clientService.service_code, clientService);
    }
    return map;
  }, new Map<string, (typeof clientServices)[number]>());
  const availableServices = services.filter(
    (service) => service.is_active && CURRENT_SERVICE_CODES.has(service.code) && !activeServiceCodes.has(service.code),
  );

  const servicesByCategory = availableServices.reduce<Record<string, DbService[]>>((acc, service) => {
    const category = service.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(service);
    return acc;
  }, {});

  const getServiceName = (code: string) =>
    services.find((service) => service.code === code)?.name || code;

  const getServiceCategory = (code: string) =>
    services.find((service) => service.code === code)?.category || "";

  const resetDialog = () => {
    setSelectedCode("");
    setBillingCycle(DEFAULT_BILLING_CYCLE);
    setNotes("");
  };

  const handleAdd = async () => {
    if (!selectedCode) return;

    setSaving(true);
    const existing = inactiveByServiceCode.get(selectedCode);
    const payload = {
      client_id: clientId,
      service_code: selectedCode,
      status: "active",
      is_active: true,
      billing_cycle: billingCycle,
      notes: notes.trim() || null,
    };

    const { error } = existing
      ? await supabase.from("client_services").update(payload).eq("id", existing.id)
      : await supabase.from("client_services").insert(payload);
    setSaving(false);

    if (error) {
      toast({ title: "Failed to activate service", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Service activated" });
    qc.invalidateQueries({ queryKey: ["client_services", clientId] });
    setOpen(false);
    resetDialog();
  };

  const handlePause = async (id: string) => {
    setPausingId(id);
    const { error } = await supabase
      .from("client_services")
      .update({ is_active: false, status: "paused" })
      .eq("id", id);
    setPausingId(null);

    if (error) {
      toast({ title: "Failed to pause service", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Service paused" });
    qc.invalidateQueries({ queryKey: ["client_services", clientId] });
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm">
      <div className="px-4 py-3.5 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-heading font-bold text-foreground">
          Active Services ({activeClientServices.length})
        </h3>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Service
        </Button>
      </div>

      <div className="divide-y divide-border">
        {activeClientServices.map((clientService) => (
          <div key={clientService.id} className="px-4 py-3.5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">{getServiceName(clientService.service_code)}</p>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={getServiceCategory(clientService.service_code)} />
                {clientService.billing_cycle && (
                  <span className="text-xs text-muted-foreground capitalize">
                    {clientService.billing_cycle.replace(/_/g, " ")}
                  </span>
                )}
              </div>
              {clientService.notes && (
                <p className="text-xs text-muted-foreground mt-1 max-w-xl">{clientService.notes}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <StatusBadge status={clientService.status} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePause(clientService.id)}
                disabled={pausingId === clientService.id}
                className="gap-1.5"
              >
                {pausingId === clientService.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <PauseCircle className="h-3.5 w-3.5" />
                )}
                Pause
              </Button>
            </div>
          </div>
        ))}

        {!isLoading && activeClientServices.length === 0 && (
          <p className="px-4 py-6 text-sm text-muted-foreground text-center">No active services assigned</p>
        )}

        {isLoading && (
          <div className="px-4 py-6 flex justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) resetDialog();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold">Add Service</DialogTitle>
            <DialogDescription>
              Select an available service and optional billing details for this client.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Service</Label>
              <Select value={selectedCode} onValueChange={setSelectedCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(servicesByCategory).length > 0 ? (
                    Object.entries(servicesByCategory).map(([category, categoryServices]) => (
                      <SelectGroup key={category}>
                        <SelectLabel>{category}</SelectLabel>
                        {categoryServices.map((service) => (
                          <SelectItem key={service.code} value={service.code}>
                            {service.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No available services</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label>Billing Cycle</Label>
              <Select value={billingCycle} onValueChange={setBillingCycle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="once_off">Once-off</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="service-notes">Notes</Label>
              <Textarea
                id="service-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional service notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!selectedCode || saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Add Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
