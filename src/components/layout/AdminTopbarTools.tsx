import { useState } from "react";
import {
  Command,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const commandItems = [
  { label: "Urgent", count: 3, tone: "text-destructive border-destructive/20 bg-destructive/5" },
  { label: "Blocked", count: 5, tone: "text-amber-700 border-amber-200 bg-amber-500/10" },
  { label: "Client Waiting", count: 7, tone: "text-sky-700 border-sky-200 bg-sky-500/10" },
  { label: "Due Today", count: 4, tone: "text-foreground border-border bg-muted/50" },
  { label: "Reports Due", count: 2, tone: "text-primary border-primary/20 bg-primary/10" },
];

const helpSections = [
  {
    title: "How to use this dashboard",
    body: "Use the attention indicators to decide what needs action first. They are a quick admin queue, not client-facing status labels.",
  },
  {
    title: "Priority statuses",
    body: "Urgent, blocked, client waiting, due today, and reports due show where admin attention is needed before normal work continues.",
  },
  {
    title: "Client communication queue",
    body: "Client waiting means a task needs a reply, content, approval, payment confirmation, or another response from the client.",
  },
  {
    title: "Reporting flow",
    body: "Completed tasks should flow into weekly or monthly client reports so clients can see what Koca Bean checked, fixed, and recommends next.",
  },
  {
    title: "Advanced admin tools",
    body: "Advanced admin tools are for diagnostics only. They should not be used for destructive actions or direct database editing.",
  },
];

const advancedTiles = [
  "System Health",
  "Raw Records",
  "Service Diagnostics",
  "Notification Logs",
  "Report Builder",
  "Failed Automations",
  "Security Checks",
  "Admin Notes",
];

export const AdminTopbarTools = () => {
  const [helpOpen, setHelpOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="hidden min-w-0 items-center gap-1.5 xl:flex">
        {commandItems.map((item) => (
          <div
            key={item.label}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-md border px-2 text-xs font-medium",
              item.tone,
            )}
          >
            <span className="tabular-nums font-bold">{item.count}</span>
            <span className="whitespace-nowrap">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="hidden min-w-0 items-center gap-1.5 md:flex xl:hidden">
        {commandItems.slice(0, 3).map((item) => (
          <Tooltip key={item.label}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-bold tabular-nums",
                  item.tone,
                )}
              >
                {item.count}
              </div>
            </TooltipTrigger>
            <TooltipContent>{item.label}</TooltipContent>
          </Tooltip>
        ))}
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 px-2.5 text-xs"
            onClick={() => setHelpOpen(true)}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Help</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>KBCC Admin Help</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setAdvancedOpen(true)}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="sr-only">Advanced Admin</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Advanced Admin</TooltipContent>
      </Tooltip>

      <Sheet open={helpOpen} onOpenChange={setHelpOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>KBCC Admin Help</SheetTitle>
            <SheetDescription>
              Quick guidance for reading the admin attention queue and reporting flow.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-5">
            {helpSections.map((section) => (
              <section key={section.title} className="space-y-1.5">
                <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{section.body}</p>
              </section>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Advanced Admin Tools</SheetTitle>
            <SheetDescription>
              Safe placeholder diagnostics. These tiles do not perform destructive actions.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {advancedTiles.map((tile) => (
              <div key={tile} className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-background p-2 text-muted-foreground">
                    <Command className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{tile}</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Placeholder diagnostics only.
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
