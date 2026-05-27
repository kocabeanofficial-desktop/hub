import { useMemo, useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getBusinessName, getContactEmail, getContactFullName, getContactPhone, getReviewField } from "@/lib/intakeReview";
import type { DbIntakeSubmission } from "@/types/database";

type DeleteOptions = {
  deleteLinkedClient: boolean;
  deleteLinkedProject: boolean;
};

interface Props {
  open: boolean;
  enquiries: DbIntakeSubmission[];
  deleting?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (options: DeleteOptions) => Promise<void> | void;
}

const previewLabel = (enquiry: DbIntakeSubmission) =>
  getContactFullName(enquiry) || getBusinessName(enquiry) || getContactEmail(enquiry) || "Unnamed enquiry";

const previewMeta = (enquiry: DbIntakeSubmission) =>
  [
    getBusinessName(enquiry),
    getContactEmail(enquiry),
    getContactPhone(enquiry),
    getReviewField(enquiry, "selected_package") || enquiry.service_type || enquiry.business_type,
  ].filter(Boolean).join(" / ");

export function DeleteEnquiriesDialog({ open, enquiries, deleting = false, onOpenChange, onConfirm }: Props) {
  const [confirmation, setConfirmation] = useState("");
  const [deleteLinkedClient, setDeleteLinkedClient] = useState(false);
  const [deleteLinkedProject, setDeleteLinkedProject] = useState(false);

  const linkedClientCount = useMemo(() => enquiries.filter((enquiry) => !!enquiry.client_id).length, [enquiries]);
  const linkedProjectCount = useMemo(() => enquiries.filter((enquiry) => !!enquiry.project_id).length, [enquiries]);
  const previewEnquiries = useMemo(() => enquiries.slice(0, 5), [enquiries]);
  const remainingPreviewCount = Math.max(enquiries.length - previewEnquiries.length, 0);
  const canDelete = confirmation === "DELETE" && enquiries.length > 0 && !deleting;

  const reset = () => {
    setConfirmation("");
    setDeleteLinkedClient(false);
    setDeleteLinkedProject(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete enquiry{enquiries.length === 1 ? "" : "ies"}
          </DialogTitle>
          <DialogDescription>
            This archives {enquiries.length} selected enquiry record{enquiries.length === 1 ? "" : "s"} and removes {enquiries.length === 1 ? "it" : "them"} from the active enquiries list. Records are not hard deleted.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
            <div className="min-w-0">
              <p className="font-medium text-foreground">
                {enquiries.length === 1 ? "This enquiry will be archived" : `${enquiries.length} enquiries will be archived`}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Archive only the selected enquiry records you no longer want in the active list.
              </p>
            </div>
          </div>
        </div>

        {previewEnquiries.length > 0 && (
          <div className="rounded-xl border border-border bg-muted/30 divide-y divide-border overflow-hidden">
            {previewEnquiries.map((enquiry) => {
              const meta = previewMeta(enquiry);
              return (
                <div key={enquiry.id} className="px-3 py-2">
                  <p className="text-sm font-medium text-foreground truncate">{previewLabel(enquiry)}</p>
                  {meta && <p className="text-xs text-muted-foreground mt-0.5 truncate">{meta}</p>}
                </div>
              );
            })}
            {remainingPreviewCount > 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                Plus {remainingPreviewCount} more selected enquir{remainingPreviewCount === 1 ? "y" : "ies"}.
              </p>
            )}
          </div>
        )}

        {(linkedClientCount > 0 || linkedProjectCount > 0) && (
          <div className="rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Linked records found</p>
                <p className="text-xs mt-0.5">
                  {linkedClientCount} linked client{linkedClientCount === 1 ? "" : "s"} and {linkedProjectCount} linked project{linkedProjectCount === 1 ? "" : "s"} may remain active unless selected below.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {linkedClientCount > 0 && (
            <label className="flex items-start gap-2 rounded-xl border border-border px-3 py-2 text-sm">
              <Checkbox checked={deleteLinkedClient} onCheckedChange={(checked) => setDeleteLinkedClient(checked === true)} />
              <span>
                <span className="font-medium text-foreground">Archive linked client</span>
                <span className="block text-xs text-muted-foreground">Unchecked by default. This updates linked client status to archived.</span>
              </span>
            </label>
          )}

          {linkedProjectCount > 0 && (
            <label className="flex items-start gap-2 rounded-xl border border-border px-3 py-2 text-sm">
              <Checkbox checked={deleteLinkedProject} onCheckedChange={(checked) => setDeleteLinkedProject(checked === true)} />
              <span>
                <span className="font-medium text-foreground">Archive linked project</span>
                <span className="block text-xs text-muted-foreground">Unchecked by default. This updates linked project stage to archived.</span>
              </span>
            </label>
          )}

          <div className="grid gap-1.5">
            <label htmlFor="delete-confirm" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Type DELETE to confirm
            </label>
            <Input
              id="delete-confirm"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder="DELETE"
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={!canDelete}
            onClick={() => onConfirm({ deleteLinkedClient, deleteLinkedProject })}
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
