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
  primary: "bg-primary/5 border border-primary/20",
  warning: "bg-warning/5 border border-warning/20",
  success: "bg-success/5 border border-success/20",
  info: "bg-info/5 border border-info/20",
};

const iconVariants = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  warning: "bg-warning/10 text-warning",
  success: "bg-success/10 text-success",
  info: "bg-info/10 text-info",
};

export const StatCard = ({ title, value, icon: Icon, trend, variant = "default", className }: StatCardProps) => (
  <div className={cn("rounded-lg p-4 sm:p-5 animate-fade-in", variantStyles[variant], className)}>
    <div className="flex items-start justify-between">
      <div className="space-y-1">
        <p className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-2xl sm:text-3xl font-heading font-bold text-foreground">{value}</p>
        {trend && <p className="text-xs text-muted-foreground">{trend}</p>}
      </div>
      <div className={cn("rounded-lg p-2.5", iconVariants[variant])}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </div>
);
