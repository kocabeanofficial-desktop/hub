import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useIntakeSubmissions } from "@/hooks/useSupabaseData";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useState } from "react";
import { Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const Enquiries = () => {
  const { data: enquiries = [], isLoading, isError, error } = useIntakeSubmissions();
  const [search, setSearch] = useState("");

  const filtered = enquiries.filter((e) => {
    const q = search.toLowerCase();
    return (
      (e.submitter_name || "").toLowerCase().includes(q) ||
      (e.business_name || "").toLowerCase().includes(q) ||
      (e.submitter_email || "").toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">Enquiries</h1>
          <p className="text-sm text-muted-foreground mt-1">Incoming intake submissions.</p>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
          />
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : isError ? (
            <div className="px-4 py-12 text-center text-sm text-destructive">
              Failed to load enquiries: {(error as Error)?.message || "Unknown error"}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">No enquiries found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Business</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Email</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((enq) => (
                    <tr key={enq.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3.5 font-medium text-foreground">{enq.submitter_name || "—"}</td>
                      <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell">{enq.business_name || "—"}</td>
                      <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell">{enq.submitter_email || "—"}</td>
                      <td className="px-4 py-3.5 hidden lg:table-cell"><StatusBadge status={enq.status || "new"} /></td>
                      <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{new Date(enq.created_at).toLocaleDateString("en-ZA")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Enquiries;
