import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useState } from "react";
import { Search, Eye, UserPlus, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { IceboxTab, useIceboxCount } from "@/components/enquiries/IceboxTab";
import type { DbIntakeSubmission } from "@/types/database";

function useWebsiteEnquiries() {
  return useQuery({
    queryKey: ["intake_submissions", "website"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intake_submissions")
        .select("*")
        .in("status", ["new", "processed", "contacted", "qualified", "converted", "closed"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DbIntakeSubmission[];
    },
  });
}

const Enquiries = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<DbIntakeSubmission | null>(null);
  const [converting, setConverting] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const { data: enquiries = [], isLoading, isError } = useWebsiteEnquiries();
  const { data: iceboxCount = 0 } = useIceboxCount();
  const queryClient = useQueryClient();

  const filtered = enquiries.filter((e) => {
    const name = (e.submitter_name || e.business_name || "").toLowerCase();
    const email = (e.submitter_email || "").toLowerCase();
    const matchesSearch = name.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleMarkReviewed = async (enq: DbIntakeSubmission) => {
    setReviewing(true);
    try {
      const { error } = await supabase
        .from("intake_submissions")
        .update({ status: "contacted" })
        .eq("id", enq.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["intake_submissions"] });
      toast({ title: "Marked as reviewed" });
      setSelected(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setReviewing(false);
    }
  };

  const handleConvert = async (enq: DbIntakeSubmission) => {
    setConverting(true);
    try {
      const { data: newClient, error: clientErr } = await supabase
        .from("clients")
        .insert({
          business_name: enq.business_name || enq.submitter_name || "Unnamed",
          email: enq.submitter_email,
          phone: enq.submitter_phone,
          status: "active",
        })
        .select("id")
        .single();
      if (clientErr) throw clientErr;

      const firstService = enq.requested_services?.split(",")[0]?.trim() || "website_build";
      const { error: projErr } = await supabase.from("projects").insert({
        client_id: newClient.id,
        project_name: (enq.business_name || enq.submitter_name || "New") + " Project",
        project_type: firstService,
        stage: "enquiry",
        priority: "normal",
        internal_notes: enq.processing_notes,
        due_date: null,
      });
      if (projErr) throw projErr;

      const { error: updateErr } = await supabase
        .from("intake_submissions")
        .update({ status: "converted" })
        .eq("id", enq.id);
      if (updateErr) throw updateErr;

      await queryClient.invalidateQueries({ queryKey: ["intake_submissions"] });
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Converted successfully", description: "Client and project created." });
      setSelected(null);
    } catch (err: any) {
      toast({ title: "Conversion failed", description: err.message, variant: "destructive" });
    } finally {
      setConverting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">Enquiries</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage incoming enquiries and leads.</p>
        </div>

        <Tabs defaultValue="icebox" className="space-y-4">
          <TabsList>
            <TabsTrigger value="icebox" className="gap-1.5">
              Icebox
              {iceboxCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px] font-bold">
                  {iceboxCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="website">Website Enquiries</TabsTrigger>
          </TabsList>

          {/* Icebox Tab (default) */}
          <TabsContent value="icebox">
            <IceboxTab />
          </TabsContent>

          {/* Website Enquiries Tab */}
          <TabsContent value="website" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search enquiries..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="converted">Converted</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {isError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-2xl px-4 py-6 text-center text-sm text-destructive flex items-center justify-center gap-2">
                <AlertCircle className="h-4 w-4" /> Failed to load enquiries.
              </div>
            )}

            {!isError && (
              <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Submitter</th>
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Business</th>
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Email</th>
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Date</th>
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                        <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filtered.map((enq) => (
                        <tr key={enq.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3.5">
                            <p className="font-medium text-foreground">{enq.submitter_name || "Unknown"}</p>
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell">{enq.business_name || "—"}</td>
                          <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell">{enq.submitter_email || "—"}</td>
                          <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{new Date(enq.created_at).toLocaleDateString("en-ZA")}</td>
                          <td className="px-4 py-3.5"><StatusBadge status={enq.status} /></td>
                          <td className="px-4 py-3.5 text-right">
                            <Button variant="ghost" size="icon" onClick={() => setSelected(enq)} title="View details">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {isLoading && (
                  <div className="px-4 py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading enquiries...
                  </div>
                )}
                {!isLoading && filtered.length === 0 && (
                  <div className="px-4 py-12 text-center text-sm text-muted-foreground">No enquiries found.</div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Detail Modal (Website Enquiries) */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">Enquiry Details</DialogTitle>
            <DialogDescription>Review and take action on this enquiry.</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <DetailRow label="Submitter Name" value={selected.submitter_name} />
              <DetailRow label="Email" value={selected.submitter_email} />
              <DetailRow label="Phone" value={selected.submitter_phone} />
              <DetailRow label="Business Name" value={selected.business_name} />
              <DetailRow label="Requested Services" value={selected.requested_services} />
              <DetailRow label="Processing Notes" value={selected.processing_notes} />
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium w-36 shrink-0">Status</span>
                <StatusBadge status={selected.status} />
              </div>
            </div>
          )}
          {selected && selected.status !== "converted" && (
            <DialogFooter className="gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={reviewing || selected.status === "contacted"}
                onClick={() => handleMarkReviewed(selected)}
              >
                {reviewing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                Mark Reviewed
              </Button>
              <Button
                size="sm"
                disabled={converting}
                onClick={() => handleConvert(selected)}
              >
                {converting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <UserPlus className="h-4 w-4 mr-1" />}
                Convert to Client + Project
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string | null }) => (
  <div className="flex items-start gap-2">
    <span className="text-muted-foreground font-medium w-36 shrink-0">{label}</span>
    <span className="text-foreground">{value || "—"}</span>
  </div>
);

export default Enquiries;
