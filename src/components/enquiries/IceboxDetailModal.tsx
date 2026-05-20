import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Loader2, ChevronDown, MessageCircle } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import type { DbIntakeSubmission } from "@/types/database";
import { useState } from "react";

interface Props {
  submission: DbIntakeSubmission | null;
  onClose: () => void;
  onActivate: (s: DbIntakeSubmission) => void;
  onReject: (s: DbIntakeSubmission) => void;
  onWhatsApp: (s: DbIntakeSubmission) => void;
  activating: boolean;
  rejecting: boolean;
}

const Row = ({ label, value }: { label: string; value: string | null | undefined }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground font-medium w-40 shrink-0 text-xs uppercase tracking-wider">{label}</span>
      <span className="text-foreground text-sm">{value}</span>
    </div>
  );
};

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

export function IceboxDetailModal({ submission, onClose, onActivate, onReject, onWhatsApp, activating, rejecting }: Props) {
  const [jsonOpen, setJsonOpen] = useState(false);
  const s = submission;
  const payload = asRecord(s?.raw_payload);
  const payloadBody = asRecord(payload?.body);
  const selectedPlan = asString(payloadBody?.selected_plan);
  const sourceForm = asString(payloadBody?.source_form);
  const rawDetails = payload && Object.keys(payload).length > 0 ? payload : null;

  return (
    <Dialog open={!!s} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Submission Details</DialogTitle>
          <DialogDescription>Review this icebox submission.</DialogDescription>
        </DialogHeader>
        {s && (
          <div className="space-y-3">
            {/* Contact */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</p>
            <Row label="Name" value={s.full_name} />
            <Row label="Email" value={s.email} />
            <Row label="Phone" value={s.phone} />
            <Row label="WhatsApp" value={s.phone} />
            <Row label="Business" value={s.business_name} />

            {/* Source & Campaign */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Source & Campaign</p>
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground font-medium w-40 shrink-0 text-xs uppercase tracking-wider">Source</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SOURCE_COLORS[s.source] || "bg-muted text-muted-foreground"}`}>
                {s.source.replace(/_/g, " ")}
              </span>
            </div>
            <Row label="Campaign" value={s.campaign} />
            <Row label="Source Form" value={sourceForm} />
            <Row label="Selected Plan" value={selectedPlan} />

            {/* Campaign-specific fields — only show non-null */}
            {(s.trade || s.domain_of_interest || s.current_website || s.contract_term || s.needs_logo !== null || s.project_type || s.preferred_date || s.preferred_time || s.estimated_timeline || s.service_type) && (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Campaign Details</p>
                <Row label="Trade" value={s.trade} />
                <Row label="Domain Interest" value={s.domain_of_interest} />
                <Row label="Current Website" value={s.current_website} />
                <Row label="Contract Term" value={s.contract_term} />
                {s.needs_logo !== null && <Row label="Needs Logo" value={s.needs_logo ? "Yes" : "No"} />}
                <Row label="Project Type" value={s.project_type} />
                <Row label="Service Type" value={s.service_type} />
                <Row label="Preferred Date" value={s.preferred_date} />
                <Row label="Preferred Time" value={s.preferred_time} />
                <Row label="Timeline" value={s.estimated_timeline} />
              </>
            )}

            <Row label="Services" value={s.requested_services} />
            <Row label="Additional Notes" value={s.additional_notes} />
            <Row label="Notes" value={s.processing_notes} />
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium w-40 shrink-0 text-xs uppercase tracking-wider">Status</span>
              <StatusBadge status={s.status} />
            </div>

            {/* Raw JSON */}
            {rawDetails && Object.keys(rawDetails).length > 0 && (
              <Collapsible open={jsonOpen} onOpenChange={setJsonOpen}>
                <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition pt-2">
                  <ChevronDown className={`h-3 w-3 transition-transform ${jsonOpen ? "rotate-180" : ""}`} />
                  Raw submission data
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <pre className="mt-2 bg-muted/50 rounded-lg p-3 text-xs overflow-auto max-h-48 text-foreground">
                    {JSON.stringify(rawDetails, null, 2)}
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}
        {s && s.status === "icebox" && (
          <DialogFooter className="gap-2 pt-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              disabled={rejecting || activating}
              onClick={() => onReject(s)}
            >
              {rejecting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Reject
            </Button>
            {s.phone && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onWhatsApp(s)}
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                WhatsApp
              </Button>
            )}
            <Button
              size="sm"
              disabled={activating || rejecting}
              onClick={() => onActivate(s)}
            >
              {activating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Activate Client
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
