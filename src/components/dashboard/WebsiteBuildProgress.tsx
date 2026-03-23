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
      <div className="space-y-1.5">
        {WEBSITE_BUILD_STAGES.map((stage, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <div key={stage.key} className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-xl transition-colors",
              isCurrent && "bg-primary/[0.06]",
            )}>
              <div className={cn(
                "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
                isCompleted && "gradient-brand text-primary-foreground shadow-sm",
                isCurrent && "bg-primary text-primary-foreground shadow-sm shadow-primary/20",
                !isCompleted && !isCurrent && "bg-muted border border-border text-muted-foreground"
              )}>
                {isCompleted ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={cn(
                "text-sm",
                isCompleted && "text-muted-foreground",
                isCurrent && "text-foreground font-semibold",
                !isCompleted && !isCurrent && "text-muted-foreground"
              )}>
                {stage.label}
              </span>
              {isCurrent && (
                <span className="ml-auto text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  Current
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
