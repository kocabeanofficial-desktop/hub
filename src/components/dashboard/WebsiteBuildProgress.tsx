import { WEBSITE_BUILD_STAGES, WebsiteBuildStage } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface WebsiteBuildProgressProps {
  currentStage: WebsiteBuildStage;
}

export const WebsiteBuildProgress = ({ currentStage }: WebsiteBuildProgressProps) => {
  const currentIndex = WEBSITE_BUILD_STAGES.findIndex((s) => s.key === currentStage);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-heading font-semibold text-foreground">Website Build Progress</h3>
      <div className="space-y-1">
        {WEBSITE_BUILD_STAGES.map((stage, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <div key={stage.key} className="flex items-center gap-3">
              <div className={cn(
                "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-colors",
                isCompleted && "bg-success border-success text-success-foreground",
                isCurrent && "bg-primary border-primary text-primary-foreground",
                !isCompleted && !isCurrent && "bg-muted border-border text-muted-foreground"
              )}>
                {isCompleted ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={cn(
                "text-sm",
                isCompleted && "text-muted-foreground line-through",
                isCurrent && "text-foreground font-semibold",
                !isCompleted && !isCurrent && "text-muted-foreground"
              )}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
