import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Eye, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IceboxDetailModal } from "./IceboxDetailModal";
import type { DbIntakeSubmission } from "@/types/database";
import {
  EMAIL_MIGRATION_PACKAGE,
  isBusinessEmailPackage,
  isEmailMigrationService,
  projectNameForService,
  resolveServiceType,
} from "@/lib/serviceTypeConfig";
import * as intakeReview from "@/lib/intakeReview";

const SOURCE_COLORS: Record<string, string> = {
  managed_hosting: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  business_email: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  contractor_special: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  hire_out: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  website: "bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-300",
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;

const getPayloadBody = (submission: DbIntakeSubmission) => {
  const payload = asRecord(submission.raw_payload);
  return asRecord(payload?.body) || payload;
};

const joinArray = (value: unknown) => Array.isArray(value) ? value.filter(Boolean).join(", ") : "";

const readPath = (source: Record<string, unknown> | null, path: string) => {
  if (!source) return "";
  let current: unknown = source;
  for (const part of path.split(".")) current = asRecord(current)?.[part];
  return asString(current) || joinArray(current);
};

const field = (submission: DbIntakeSubmission, key: string, ...paths: string[]) => {
  const direct = (submission as unknown as Record<string, unknown>)[key];
  if (asString(direct)) return asString(direct);
  if (Array.isArray(direct)) return joinArray(direct);
  const body = getPayloadBody(submission);
  const rawBrief = asRecord(body?.raw_payload);
  const reviewOverrides = asRecord(body?.review_overrides);
  for (const source of [reviewOverrides, body, rawBrief]) {
    for (const path of [key, ...paths]) {
      const value = readPath(source, path);
      if (value) return value;
    }
  }
  return "";
};

const serviceCodeFor = (submission: DbIntakeSubmission) => {
  const selectedPackage = intakeReview.getReviewField(submission, "selected_package", "raw_payload.selected_plan", "raw_payload.body.selected_plan", "raw_payload.package_type", "raw_payload.body.package_type");
  if (isBusinessEmailPackage(selectedPackage)) return selectedPackage;
  if (isEmailMigrationService(field(submission, "service_type"), selectedPackage)) return EMAIL_MIGRATION_PACKAGE.selectedPackage;
  return field(submission, "service_type") || "general_enquiry";
};

const buildOriginalBriefNotes = (submission: DbIntakeSubmission) => {
  const body = getPayloadBody(submission);
  const rawBrief = asRecord(body?.raw_payload);
  const selectedPlan = asString(body?.selected_plan) || asString(rawBrief?.selected_plan);
  const packageType = asString(body?.package_type) || asString(rawBrief?.package_type);
  const setupFee = asString(body?.setup_fee) || asString(rawBrief?.setup_fee);
  const monthlyFee = asString(body?.monthly_fee) || asString(rawBrief?.monthly_fee);
  const businessOverview = asRecord(body?.business_overview) || asRecord(rawBrief?.business_overview);
  const websiteGoals = asRecord(body?.website_goals) || asRecord(rawBrief?.website_goals);
  const pagesNeeded = asRecord(body?.pages_needed) || asRecord(rawBrief?.pages_needed);
  const timeline = asRecord(body?.timeline) || asRecord(rawBrief?.timeline);

  const summaryLines = [
    "Original Smart Website Setup Brief",
    selectedPlan ? `Selected plan: ${selectedPlan}` : null,
    packageType ? `Package type: ${packageType}` : null,
    setupFee ? `Setup fee: ${setupFee}` : null,
    monthlyFee ? `Monthly fee: ${monthlyFee}` : null,
    businessOverview?.industry ? `Industry: ${businessOverview.industry}` : null,
    businessOverview?.business_description ? `Business overview: ${businessOverview.business_description}` : null,
    websiteGoals?.goals ? `Website goals: ${joinArray(websiteGoals.goals)}` : null,
    websiteGoals?.main_visitor_action ? `Main visitor action: ${websiteGoals.main_visitor_action}` : null,
    pagesNeeded?.pages ? `Pages needed: ${joinArray(pagesNeeded.pages)}` : null,
    timeline?.start_timing ? `Start timing: ${timeline.start_timing}` : null,
    timeline?.launch_deadline ? `Launch deadline: ${timeline.launch_deadline}` : null,
  ].filter(Boolean);

  return [summaryLines.join("\n"), submission.additional_notes].filter(Boolean).join("\n\n");
};

export function useIceboxCount() {
  return useQuery({
    queryKey: ["intake_submissions", "icebox_count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("intake_submissions")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .eq("status", "icebox");
      if (error) throw error;
      return count ?? 0;
    },
  });
}

function useIceboxSubmissions() {
  return useQuery({
    queryKey: ["intake_submissions", "icebox"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intake_submissions")
        .select("*")
        .is("deleted_at", null)
        .eq("status", "icebox")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DbIntakeSubmission[];
    },
  });
}

export function IceboxTab() {
  const { data: submissions = [], isLoading, isError } = useIceboxSubmissions();
  const [selected, setSelected] = useState<DbIntakeSubmission | null>(null);
  const [activating, setActivating] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["intake_submissions"] });
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    queryClient.invalidateQueries({ queryKey: ["client_services"] });
  };

  const handleActivate = async (s: DbIntakeSubmission) => {
    if (s.client_id || s.project_id) {
      toast({
        title: "Already activated",
        description: "This intake is already linked to a client or project. Refresh before trying again.",
        variant: "destructive",
      });
      return;
    }

    setActivating(true);
    try {
      const { serviceType, config, usedFallback } = resolveServiceType(serviceCodeFor(s));
      const businessName = intakeReview.getBusinessName(s) || intakeReview.getContactFullName(s) || "Unnamed";
      const activationStartedAt = new Date().toISOString();

      // Create client
      const { data: newClient, error: cErr } = await supabase
        .from("clients")
        .insert({
          business_name: businessName,
          phone: intakeReview.getContactPhone(s) || s.phone,
          email: intakeReview.getContactEmail(s) || intakeReview.getAdminContactEmail(s) || s.email,
          website_url: field(s, "existing_domain", "desired_domain") || null,
          notes: field(s, "notes", "final_notes", "additional_notes") || null,
          status: "active",
        })
        .select("id")
        .single();
      if (cErr) {
        console.error("Failed to create client during icebox activation", cErr);
        throw new Error("Failed to create client");
      }

      const { error: serviceErr } = await supabase
        .from("client_services")
        .insert({
          client_id: newClient.id,
          service_code: serviceType,
          is_active: true,
          source: "enquiry_activation",
          status: "active",
          started_at: activationStartedAt,
          billing_cycle: serviceType.startsWith("business_email") ? "monthly" : serviceType === EMAIL_MIGRATION_PACKAGE.selectedPackage ? "once_off" : null,
        });
      if (serviceErr) {
        console.error("Failed to create service during icebox activation", serviceErr);
        throw new Error("Failed to create service");
      }

      let projectId: string | null = null;

      if (config.requiresProject && config.projectType) {
        const { data: newProject, error: pErr } = await supabase
          .from("projects")
          .insert({
            client_id: newClient.id,
            project_name: projectNameForService(serviceType, businessName),
            project_type: config.projectType,
            stage: "enquiry_received",
            priority: "medium",
            description: s.processing_notes || s.additional_notes,
            internal_notes: buildOriginalBriefNotes(s),
          })
          .select("id")
          .single();
        if (pErr) {
          console.error("Failed to create project during icebox activation", pErr);
          throw new Error("Failed to create project");
        }
        projectId = newProject.id;
      }

      // Mark activated and preserve the intake relationship
      const { error: uErr } = await supabase
        .from("intake_submissions")
        .update({
          status: "activated",
          client_id: newClient.id,
          project_id: projectId,
        })
        .eq("id", s.id);
      if (uErr) {
        console.error("Failed to update enquiry during icebox activation", uErr);
        throw new Error("Failed to update enquiry");
      }

      invalidate();
      toast({
        title: usedFallback ? "Client activated as General Enquiry" : "Client activated successfully",
        description: config.requiresProject
          ? `${config.label} project created.`
          : `${config.label} service created. No project created.`,
      });
      setSelected(null);
    } catch (err: unknown) {
      toast({
        title: "Activation failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setActivating(false);
    }
  };

  const handleReject = async (s: DbIntakeSubmission) => {
    setRejecting(true);
    try {
      const { error } = await supabase
        .from("intake_submissions")
        .update({ status: "rejected" })
        .eq("id", s.id);
      if (error) throw error;
      invalidate();
      toast({ title: "Submission rejected" });
      setSelected(null);
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    } finally {
      setRejecting(false);
    }
  };

  const handleWhatsApp = (s: DbIntakeSubmission) => {
    if (!s.phone) return;
    // Clean number: remove spaces, replace leading 0 with 27
    let num = s.phone.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
    if (num.startsWith("0")) {
      num = "27" + num.slice(1);
    }
    // Remove leading + if present
    num = num.replace(/^\+/, "");
    window.open(`https://wa.me/${num}`, "_blank");
  };

  if (isError) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-2xl px-4 py-6 text-center text-sm text-destructive flex items-center justify-center gap-2">
        <AlertCircle className="h-4 w-4" /> Failed to load icebox submissions.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="px-4 py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading icebox...
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="px-4 py-12 text-center text-sm text-muted-foreground">No icebox submissions.</div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {submissions.map((s) => (
          <div
            key={s.id}
            className="bg-card rounded-2xl border border-border p-4 shadow-sm flex flex-col gap-3 hover:border-primary/30 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-foreground text-sm">{intakeReview.getContactFullName(s) || "Unknown"}</p>
                {intakeReview.getBusinessName(s) && (
                  <p className="text-xs text-muted-foreground">{intakeReview.getBusinessName(s)}</p>
                )}
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${SOURCE_COLORS[s.source] || "bg-muted text-muted-foreground"}`}
              >
                {s.source.replace(/_/g, " ")}
              </span>
            </div>

            {s.phone && (
              <p className="text-xs text-muted-foreground">📱 {s.phone}</p>
            )}

            <div className="flex items-center justify-between mt-auto">
              <div className="flex items-center gap-2 flex-wrap">
                {s.source && (
                  <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {s.source}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {new Date(s.created_at).toLocaleDateString("en-ZA")}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelected(s)}>
                <Eye className="h-3.5 w-3.5 mr-1" /> View
              </Button>
            </div>
          </div>
        ))}
      </div>

      <IceboxDetailModal
        submission={selected}
        onClose={() => setSelected(null)}
        onActivate={handleActivate}
        onReject={handleReject}
        onWhatsApp={handleWhatsApp}
        activating={activating}
        rejecting={rejecting}
      />
    </>
  );
}
