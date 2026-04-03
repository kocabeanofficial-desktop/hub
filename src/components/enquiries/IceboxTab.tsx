import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Eye, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IceboxDetailModal } from "./IceboxDetailModal";
import type { DbIntakeSubmission } from "@/types/database";

const SOURCE_COLORS: Record<string, string> = {
  managed_hosting: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  business_email: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  contractor_special: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  hire_out: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

export function useIceboxCount() {
  return useQuery({
    queryKey: ["intake_submissions", "icebox_count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("intake_submissions")
        .select("id", { count: "exact", head: true })
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
  };

  const handleActivate = async (s: DbIntakeSubmission) => {
    setActivating(true);
    try {
      const { data: newClient, error: cErr } = await supabase
        .from("clients")
        .insert({
          business_name: s.business_name || s.submitter_name || "Unnamed",
          phone: s.whatsapp_number || s.submitter_phone,
          email: s.submitter_email,
          status: "active",
        })
        .select("id")
        .single();
      if (cErr) throw cErr;

      const { error: pErr } = await supabase.from("projects").insert({
        client_id: newClient.id,
        project_name: (s.business_name || s.submitter_name || "New") + " Project",
        project_type: s.source || "website_build",
        stage: "intake",
        priority: "normal",
      });
      if (pErr) throw pErr;

      const { error: uErr } = await supabase
        .from("intake_submissions")
        .update({ status: "activated" })
        .eq("id", s.id);
      if (uErr) throw uErr;

      invalidate();
      toast({ title: "Client activated successfully" });
      setSelected(null);
    } catch (err: any) {
      toast({ title: "Activation failed", description: err.message, variant: "destructive" });
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
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setRejecting(false);
    }
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
                <p className="font-medium text-foreground text-sm">{s.submitter_name || "Unknown"}</p>
                {s.business_name && (
                  <p className="text-xs text-muted-foreground">{s.business_name}</p>
                )}
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${SOURCE_COLORS[s.source] || "bg-muted text-muted-foreground"}`}
              >
                {s.source.replace(/_/g, " ")}
              </span>
            </div>

            {s.whatsapp_number && (
              <p className="text-xs text-muted-foreground">📱 {s.whatsapp_number}</p>
            )}

            <div className="flex items-center justify-between mt-auto">
              <div className="flex items-center gap-2">
                {s.campaign && (
                  <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {s.campaign}
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
        activating={activating}
        rejecting={rejecting}
      />
    </>
  );
}
