import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useAutomationEvents } from "@/hooks/useSupabaseData";
import { Activity } from "lucide-react";

const ActivityLog = () => {
  const { data: events = [], isLoading } = useAutomationEvents();

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">Activity Log</h1>
          <p className="text-sm text-muted-foreground mt-1">Track all system events and actions.</p>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm">
          <div className="divide-y divide-border">
            {events.map((event) => (
              <div key={event.id} className="px-4 sm:px-5 py-4 flex items-start gap-3 hover:bg-muted/20 transition-colors">
                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center mt-0.5">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{event.message || event.event_type}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.created_at).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground capitalize">{event.event_type.replace(/_/g, " ")}</span>
                    {event.event_source && (
                      <>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{event.event_source}</span>
                      </>
                    )}
                  </div>
                </div>
                <StatusBadge status={event.status} />
              </div>
            ))}
          </div>
          {isLoading && <div className="px-4 py-12 text-center text-sm text-muted-foreground">Loading...</div>}
          {!isLoading && events.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">No activity events yet.</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ActivityLog;
