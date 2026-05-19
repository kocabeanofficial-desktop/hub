import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import type { DbIntakeSubmission } from "@/types/database";

interface Props {
  clientId?: string;
  projectId?: string;
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;

const payloadBody = (submission: DbIntakeSubmission) => {
  const payload = asRecord(submission.raw_payload);
  return asRecord(payload?.body) || payload;
};

const selectedPlan = (submission: DbIntakeSubmission) => {
  const body = payloadBody(submission);
  const rawBrief = asRecord(body?.raw_payload);
  return asString(body?.selected_plan) || asString(rawBrief?.selected_plan);
};

const sourceForm = (submission: DbIntakeSubmission) => {
  const body = payloadBody(submission);
  const rawBrief = asRecord(body?.raw_payload);
  return asString(body?.source_form) || asString(rawBrief?.source_form);
};

export function OriginalIntakeBriefSection({ clientId, projectId }: Props) {
  const enabled = !!clientId || !!projectId;
  const { data: submissions = [], isLoading, isError } = useQuery({
    queryKey: ["intake_submissions", "linked", clientId, projectId],
    queryFn: async () => {
      let query = supabase
        .from("intake_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (projectId) {
        query = query.eq("project_id", projectId);
      } else if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as DbIntakeSubmission[];
    },
    enabled,
  });

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base font-heading font-semibold text-foreground">Original Intake Brief</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Linked website/package intake details preserved from Icebox activation.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading intake brief...
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive">Failed to load linked intake brief.</p>
      )}

      {!isLoading && !isError && submissions.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <p className="text-sm font-medium text-foreground">No linked intake brief</p>
          <p className="text-xs text-muted-foreground mt-1">
            Intake submissions activated before linking was added may not appear here.
          </p>
        </div>
      )}

      {!isLoading && !isError && submissions.length > 0 && (
        <div className="space-y-4">
          {submissions.map((submission) => {
            const body = payloadBody(submission);
            return (
              <article key={submission.id} className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {selectedPlan(submission) || submission.requested_services || submission.source}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Submitted {new Date(submission.created_at).toLocaleDateString("en-ZA")}
                      {sourceForm(submission) ? ` · ${sourceForm(submission)}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={submission.status} />
                </div>

                {submission.additional_notes && (
                  <pre className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs text-foreground overflow-auto max-h-80">
                    {submission.additional_notes}
                  </pre>
                )}

                {body && Object.keys(body).length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
                      Raw submission data
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-foreground overflow-auto max-h-80">
                      {JSON.stringify(body, null, 2)}
                    </pre>
                  </details>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
