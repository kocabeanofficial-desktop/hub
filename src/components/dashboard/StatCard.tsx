import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  variant?: "default" | "primary" | "warning" | "success" | "info";
  className?: string;
}

const variantStyles = {
  default: "bg-card border border-border",
  primary: "bg-primary/[0.04] border border-primary/15",
  warning: "bg-warning/[0.04] border border-warning/15",
  success: "bg-success/[0.04] border border-success/15",
  info: "bg-info/[0.04] border border-info/15",
};

const iconVariants = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  warning: "bg-warning/10 text-warning",
  success: "bg-success/10 text-success",
  info: "bg-info/10 text-info",
};

export const StatCard = ({ title, value, icon: Icon, trend, variant = "default", className }: StatCardProps) => (
  <div className={cn("rounded-2xl p-4 sm:p-5 animate-fade-in transition-shadow hover:shadow-sm", variantStyles[variant], className)}>
    <div className="flex items-start justify-between">
      <div className="space-y-1">
        <p className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-2xl sm:text-3xl font-heading font-bold text-foreground">{value}</p>
        {trend && <p className="text-xs text-muted-foreground">{trend}</p>}
      </div>
      <div className={cn("rounded-xl p-2.5", iconVariants[variant])}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </div>
);
