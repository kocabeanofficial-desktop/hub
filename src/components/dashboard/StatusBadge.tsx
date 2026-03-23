import { cn } from "@/lib/utils";

type BadgeVariant = "new" | "contacted" | "qualified" | "converted" | "closed"
  | "active" | "paused" | "completed" | "cancelled" | "onboarding" | "inactive"
  | "open" | "in_progress" | "resolved" | "todo" | "done"
  | "low" | "medium" | "high" | "urgent"
  | "draft" | "ready" | "sent"
  | "pending" | "failed"
  | "live";

const variantMap: Record<string, string> = {
  new: "bg-info/10 text-info border-info/20",
  contacted: "bg-warning/10 text-warning border-warning/20",
  qualified: "bg-primary/10 text-primary border-primary/20",
  converted: "bg-success/10 text-success border-success/20",
  closed: "bg-muted text-muted-foreground border-border",
  active: "bg-success/10 text-success border-success/20",
  paused: "bg-warning/10 text-warning border-warning/20",
  completed: "bg-success/10 text-success border-success/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  onboarding: "bg-info/10 text-info border-info/20",
  inactive: "bg-muted text-muted-foreground border-border",
  open: "bg-warning/10 text-warning border-warning/20",
  in_progress: "bg-info/10 text-info border-info/20",
  resolved: "bg-success/10 text-success border-success/20",
  todo: "bg-muted text-muted-foreground border-border",
  done: "bg-success/10 text-success border-success/20",
  low: "bg-muted text-muted-foreground border-border",
  medium: "bg-warning/10 text-warning border-warning/20",
  high: "bg-destructive/10 text-destructive border-destructive/20",
  urgent: "bg-destructive/15 text-destructive border-destructive/30",
  draft: "bg-muted text-muted-foreground border-border",
  ready: "bg-info/10 text-info border-info/20",
  sent: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
  live: "bg-success/10 text-success border-success/20",
};

const labelMap: Record<string, string> = {
  in_progress: "In Progress",
  awaiting_deposit: "Awaiting Deposit",
  awaiting_content: "Awaiting Content",
  in_design: "In Design",
  in_development: "In Development",
  awaiting_feedback: "Awaiting Feedback",
  ready_to_launch: "Ready to Launch",
  enquiry_received: "Enquiry Received",
  ad_hoc: "Ad Hoc",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const style = variantMap[status] || "bg-muted text-muted-foreground border-border";
  const label = labelMap[status] || status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");

  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", style, className)}>
      {label}
    </span>
  );
};
