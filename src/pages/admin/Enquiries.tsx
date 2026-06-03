import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Inbox, Search, Trash2, XCircle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DeleteEnquiriesDialog } from "@/components/enquiries/DeleteEnquiriesDialog";
import { EnquiryDetailPage } from "@/components/enquiries/EnquiryDetailPage";
import { toast } from "@/hooks/use-toast";
import { ARCHIVE_FIELDS_UNAVAILABLE_MESSAGE, fetchActiveIntakeSubmissions } from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getBusinessName, getContactEmail, getContactFullName, getContactPhone, getReviewField } from "@/lib/intakeReview";
import { projectNameForService, resolveServiceType } from "@/lib/serviceTypeConfig";
import type { DbIntakeSubmission } from "@/types/database";

type DeleteOptions = {
  deleteLinkedClient: boolean;
  deleteLinkedProject: boolean;
};

const DELETE_FAILED_MESSAGE = "Could not delete the enquiry. Please check that the enquiry archive fields exist and that your admin account has permission.";
const LOAD_FAILED_MESSAGE = "Could not load enquiries. Please refresh and check your admin access.";

function useWebsiteEnquiries() {
  return useQuery({
    queryKey: ["intake_submissions", "website"],
    queryFn: fetchActiveIntakeSubmissions,
  });
}

const serviceCodeFor = (enquiry: DbIntakeSubmission) => {
  const selectedPackage = getReviewField(enquiry, "selected_package", "raw_payload.selected_plan", "raw_payload.body.selected_plan", "raw_payload.package_type", "raw_payload.body.package_type");
  const serviceType = getReviewField(enquiry, "service_type") || enquiry.service_type || "";
  if (selectedPackage?.startsWith("business_email_")) return selectedPackage;
  if (serviceType === "email_migration" || selectedPackage === "email_migration_setup") return "email_migration_setup";
  return serviceType || "general_enquiry";
};

async function activateEnquiry(enquiry: DbIntakeSubmission) {
  if (enquiry.client_id || enquiry.project_id) return;

  const { serviceType, config } = resolveServiceType(serviceCodeFor(enquiry));
  const businessName = getBusinessName(enquiry) || getContactFullName(enquiry) || "New Client";
  const activationStartedAt = new Date().toISOString();

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({
      business_name: businessName,
      email: getContactEmail(enquiry) || getReviewField(enquiry, "admin_contact_email") || null,
      phone: getContactPhone(enquiry) || null,
      website_url: getReviewField(enquiry, "existing_domain") || getReviewField(enquiry, "desired_domain") || null,
      notes: getReviewField(enquiry, "notes", "intake.final_notes", "intake.additional_notes") || null,
      status: "active",
    })
    .select()
    .single();
  if (clientError) {
    console.error("Failed to create client during enquiry activation", clientError);
    throw new Error("Failed to create client");
  }

  const { error: serviceError } = await supabase
    .from("client_services")
    .insert({
      client_id: client.id,
      service_code: serviceType,
      is_active: true,
      source: "enquiry_activation",
      status: "active",
      started_at: activationStartedAt,
      billing_cycle: serviceType.startsWith("business_email") ? "monthly" : serviceType === "email_migration_setup" ? "once_off" : null,
    });
  if (serviceError) {
    console.error("Failed to create service during enquiry activation", serviceError);
    throw new Error("Failed to create service");
  }

  let projectId: string | null = null;
  if (config.requiresProject && config.projectType) {
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        client_id: client.id,
        project_name: projectNameForService(serviceType, businessName),
        project_type: config.projectType,
        priority: "medium",
        stage: "enquiry_received",
        description: getReviewField(enquiry, "website_goals", "raw_payload.website_goals.goals", "raw_payload.body.website_goals.goals") || null,
      })
      .select("id")
      .single();
    if (projectError) {
      console.error("Failed to create project during enquiry activation", projectError);
      throw new Error("Failed to create project");
    }
    projectId = project.id;
  }

  const { error: updateError } = await supabase
    .from("intake_submissions")
    .update({ status: "activated", client_id: client.id, project_id: projectId })
    .eq("id", enquiry.id);
  if (updateError) {
    console.error("Failed to update enquiry during activation", updateError);
    throw new Error("Failed to update enquiry");
  }
}

const Enquiries = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<DbIntakeSubmission | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: enquiryResult, error: loadError, isError, isLoading } = useWebsiteEnquiries();
  const enquiries = useMemo(() => enquiryResult?.submissions ?? [], [enquiryResult]);
  const archiveSupported = enquiryResult?.archiveSupported ?? true;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["intake_submissions"] });
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    queryClient.invalidateQueries({ queryKey: ["client_services"] });
  };

  const filtered = useMemo(() => enquiries.filter((enquiry) => {
    const name = (getContactFullName(enquiry) || getBusinessName(enquiry) || "").toLowerCase();
    const email = (getContactEmail(enquiry) || "").toLowerCase();
    const matchesSearch = name.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || enquiry.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [enquiries, search, statusFilter]);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const filteredIds = useMemo(() => filtered.map((enquiry) => enquiry.id), [filtered]);
  const selectedEnquiries = enquiries.filter((enquiry) => selectedIdSet.has(enquiry.id));
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIdSet.has(id));
  const someFilteredSelected = filteredIds.some((id) => selectedIdSet.has(id));

  useEffect(() => {
    const liveIds = new Set(enquiries.map((enquiry) => enquiry.id));
    setSelectedIds((previous) => previous.filter((id) => liveIds.has(id)));
  }, [enquiries]);

  useEffect(() => {
    if (isError) console.error("Failed to load enquiries", loadError);
  }, [isError, loadError]);

  const toggleAll = () => {
    setSelectedIds((previous) => {
      const filteredIdSet = new Set(filteredIds);
      const hasAllFiltered = filteredIds.length > 0 && filteredIds.every((id) => previous.includes(id));
      if (hasAllFiltered) return previous.filter((id) => !filteredIdSet.has(id));
      return Array.from(new Set([...previous, ...filteredIds]));
    });
  };

  const toggleOne = (id: string) => {
    setSelectedIds((previous) => previous.includes(id) ? previous.filter((selectedId) => selectedId !== id) : [...previous, id]);
  };

  const updateSelectedStatus = async (status: string) => {
    if (selectedIds.length === 0) return;
    setBulkBusy(true);
    const { error } = await supabase.from("intake_submissions").update({ status }).in("id", selectedIds);
    setBulkBusy(false);
    if (error) {
      toast({ title: "Bulk update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Updated ${selectedIds.length} enquiries` });
    setSelectedIds([]);
    invalidate();
  };

  const activateSelected = async () => {
    if (selectedEnquiries.length === 0) return;
    setBulkBusy(true);
    try {
      for (const enquiry of selectedEnquiries) {
        await activateEnquiry(enquiry);
      }
      toast({ title: `Activated ${selectedEnquiries.length} enquiries` });
      setSelectedIds([]);
      invalidate();
    } catch (error) {
      toast({ title: "Bulk activation failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setBulkBusy(false);
    }
  };

  const softDeleteSelected = async ({ deleteLinkedClient, deleteLinkedProject }: DeleteOptions) => {
    if (selectedEnquiries.length === 0) return;
    if (!archiveSupported) {
      toast({
        title: "Archive unavailable",
        description: ARCHIVE_FIELDS_UNAVAILABLE_MESSAGE,
        variant: "destructive",
      });
      return;
    }
    setDeleting(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("intake_submissions")
        .update({ deleted_at: now, deleted_by: user?.id || null, status: "archived" })
        .in("id", selectedIds);
      if (error) throw error;

      const clientIds = Array.from(new Set(selectedEnquiries.map((enquiry) => enquiry.client_id).filter(Boolean))) as string[];
      const projectIds = Array.from(new Set(selectedEnquiries.map((enquiry) => enquiry.project_id).filter(Boolean))) as string[];

      if (deleteLinkedClient && clientIds.length > 0) {
        const { error: clientError } = await supabase.from("clients").update({ status: "archived" }).in("id", clientIds);
        if (clientError) throw clientError;
      }

      if (deleteLinkedProject && projectIds.length > 0) {
        const { error: projectError } = await supabase.from("projects").update({ stage: "archived" }).in("id", projectIds);
        if (projectError) throw projectError;
      }

      toast({ title: `Deleted ${selectedEnquiries.length} enquiries` });
      setDeleteDialogOpen(false);
      setSelectedIds([]);
      invalidate();
    } catch (error) {
      console.error("Failed to archive selected enquiries", error);
      toast({
        title: "Delete failed",
        description: DELETE_FAILED_MESSAGE,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (selected) {
    return (
      <DashboardLayout>
        <EnquiryDetailPage
          enquiry={selected}
          archiveSupported={archiveSupported}
          onBack={() => setSelected(null)}
          onDeleted={() => {
            setSelected(null);
            invalidate();
          }}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">Enquiries</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage incoming enquiries and leads.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="text-sm rounded-xl border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">All statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="activated">Activated</option>
            <option value="icebox">Icebox</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {!archiveSupported && (
          <div className="rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{ARCHIVE_FIELDS_UNAVAILABLE_MESSAGE}</p>
            </div>
          </div>
        )}

        {isError && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive shadow-sm">
            {LOAD_FAILED_MESSAGE}
          </div>
        )}

        {selectedIds.length > 0 && (
          <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm font-medium text-foreground">{selectedIds.length} selected</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={activateSelected} disabled={bulkBusy} className="gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Activate
              </Button>
              <Button size="sm" variant="outline" onClick={() => updateSelectedStatus("icebox")} disabled={bulkBusy} className="gap-1.5">
                <Inbox className="h-3.5 w-3.5" /> Move to Icebox
              </Button>
              <Button size="sm" variant="outline" onClick={() => updateSelectedStatus("rejected")} disabled={bulkBusy} className="gap-1.5">
                <XCircle className="h-3.5 w-3.5" /> Reject
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={bulkBusy || !archiveSupported}
                className="gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          </div>
        )}

        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 w-12 text-center">
                    <Checkbox
                      className="mx-auto border-2 border-primary/70 bg-background shadow-sm"
                      checked={allFilteredSelected || (someFilteredSelected ? "indeterminate" : false)}
                      onCheckedChange={toggleAll}
                      aria-label="Select all enquiries"
                    />
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Business</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Package</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">Loading...</td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">{LOAD_FAILED_MESSAGE}</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">No enquiries found.</td>
                  </tr>
                ) : filtered.map((enq) => {
                  const activationIncomplete = enq.status === "activated" && !enq.client_id;
                  return (
                    <tr
                      key={enq.id}
                      className="hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => setSelected(enq)}
                    >
                      <td className="px-4 py-3.5 text-center" onClick={(event) => event.stopPropagation()}>
                        <Checkbox
                          className="mx-auto border-2 border-primary/70 bg-background shadow-sm"
                          checked={selectedIds.includes(enq.id)}
                          onCheckedChange={() => toggleOne(enq.id)}
                          aria-label={`Select enquiry ${getContactFullName(enq) || enq.id}`}
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-foreground">{getContactFullName(enq) || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{getContactEmail(enq) || "No email"}</p>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell">{getBusinessName(enq) || "-"}</td>
                      <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell">{getReviewField(enq, "selected_package") || enq.business_type || "-"}</td>
                      <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{new Date(enq.created_at).toLocaleDateString("en-ZA")}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col items-start gap-1.5">
                          <StatusBadge status={activationIncomplete ? "activation incomplete" : enq.status} />
                          {activationIncomplete && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
                              <AlertTriangle className="h-3 w-3" />
                              No client link
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <DeleteEnquiriesDialog
        open={deleteDialogOpen}
        enquiries={selectedEnquiries}
        deleting={deleting}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={softDeleteSelected}
      />
    </DashboardLayout>
  );
};

export default Enquiries;
