import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useIntakeSubmissions } from "@/hooks/useSupabaseData";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { DbIntakeSubmission } from "@/types/database";

const Enquiries = () => {
  const { data: enquiries = [], isLoading, isError } = useIntakeSubmissions();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<DbIntakeSubmission | null>(null);

  const filtered = enquiries.filter((e) => {
    const q = search.toLowerCase();
    return (
      (e.full_name || "").toLowerCase().includes(q) ||
      (e.business_name || "").toLowerCase().includes(q) ||
      (e.email || "").toLowerCase().includes(q)
    );
  });

  if (selected) {
    return (
      <DashboardLayout>
        <div className="space-y-4 max-w-2xl">
          <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="gap-1.5 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <h1 className="text-xl font-heading font-extrabold text-foreground">{selected.full_name || "Unknown"}</h1>
          <div className="bg-card rounded-2xl border border-border p-4 shadow-sm space-y-2 text-sm">
            <Row label="Business" value={selected.business_name} />
            <Row label="Email" value={selected.email} />
            <Row label="Phone" value={selected.phone} />
            <Row label="Type" value={selected.business_type} />
            <Row label="Domain" value={selected.has_domain ? (selected.domain_name || "Yes") : "No"} />
            <Row label="Goal" value={selected.website_goal} />
            <Row label="Description" value={selected.business_description} />
            <Row label="Pages" value={selected.selected_pages} />
            <Row label="Status" value={selected.status} />
            <Row label="Submitted" value={new Date(selected.created_at).toLocaleDateString("en-ZA")} />
          </div>
        </div>
      </DashboardLayout>
    );
  }

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
            <div className="px-4 py-12 text-center text-sm text-destructive">Failed to load enquiries.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Business</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Email</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Date</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((enq) => (
                    <tr key={enq.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3.5 font-medium text-foreground">{enq.full_name || "—"}</td>
                      <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell">{enq.business_name || "—"}</td>
                      <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell">{enq.email || "—"}</td>
                      <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{new Date(enq.created_at).toLocaleDateString("en-ZA")}</td>
                      <td className="px-4 py-3.5 text-right">
                        <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={() => setSelected(enq)}>
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="px-4 py-12 text-center text-sm text-muted-foreground">No enquiries found.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

const Row = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div className="flex gap-3">
    <span className="font-semibold text-muted-foreground w-24 shrink-0">{label}</span>
    <span className="text-foreground">{value || "—"}</span>
  </div>
);

export default Enquiries;
