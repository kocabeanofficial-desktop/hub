import { useState } from "react";
import { useServices, useClientServices } from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel,
} from "@/components/ui/select";
import type { DbService } from "@/types/database";

interface Props {
  clientId: string;
}

export const ClientServicesSection = ({ clientId }: Props) => {
  const { data: clientServices = [], isLoading } = useClientServices(clientId);
  const { data: services = [] } = useServices();
  const [open, setOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState("");
  const [billingType, setBillingType] = useState("monthly");
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const servicesByCategory = services.reduce<Record<string, DbService[]>>((acc, s) => {
    const cat = s.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  const getServiceName = (code: string) =>
    services.find((s) => s.service_code === code)?.name || code;

  const getServiceCategory = (code: string) =>
    services.find((s) => s.service_code === code)?.category || "";

  const handleAdd = async () => {
    if (!selectedCode) return;
    setSaving(true);
    const { error } = await supabase.from("client_services").insert({
      client_id: clientId,
      service_code: selectedCode,
      is_active: true,
      billing_type: billingType,
      source: "hub_admin",
      started_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) {
      toast({ title: "Failed to add service", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Service added — tasks auto-generated" });
    qc.invalidateQueries({ queryKey: ["client_services", clientId] });
    qc.invalidateQueries({ queryKey: ["tasks"] });
    setOpen(false);
    setSelectedCode("");
    setBillingType("monthly");
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm">
      <div className="px-4 py-3.5 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-heading font-bold text-foreground">
          Services ({clientServices.length})
        </h3>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Service
        </Button>
      </div>
      <div className="divide-y divide-border">
        {clientServices.map((cs) => (
          <div key={cs.id} className="px-4 py-3.5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{getServiceName(cs.service_code)}</p>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={getServiceCategory(cs.service_code)} />
                {cs.billing_type && (
                  <span className="text-xs text-muted-foreground capitalize">{cs.billing_type}</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <StatusBadge status={cs.is_active ? "active" : "inactive"} />
              {cs.started_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(cs.started_at).toLocaleDateString("en-ZA")}
                </p>
              )}
            </div>
          </div>
        ))}
        {!isLoading && clientServices.length === 0 && (
          <p className="px-4 py-6 text-sm text-muted-foreground text-center">No services assigned</p>
        )}
        {isLoading && (
          <div className="px-4 py-6 flex justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold">Add Service</DialogTitle>
            <DialogDescription>Select a service and billing type to assign to this client.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Service</Label>
              <Select value={selectedCode} onValueChange={setSelectedCode}>
                <SelectTrigger><SelectValue placeholder="Select a service" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(servicesByCategory).map(([cat, svcs]) => (
                    <SelectGroup key={cat}>
                      <SelectLabel>{cat}</SelectLabel>
                      {svcs.map((s) => (
                        <SelectItem key={s.service_code} value={s.service_code}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Billing Type</Label>
              <Select value={billingType} onValueChange={setBillingType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="once-off">Once-off</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
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
