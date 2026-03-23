import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useIntakeSubmissions } from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Search, ArrowLeft, UserPlus, FolderPlus, Globe, Mail, Image, FileText, Phone, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { DbIntakeSubmission } from "@/types/database";

const Enquiries = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<DbIntakeSubmission | null>(null);
  const [converting, setConverting] = useState(false);
  const { data: enquiries = [], isLoading } = useIntakeSubmissions();
  const queryClient = useQueryClient();

  const filtered = enquiries.filter((e) => {
    const name = (e.full_name || e.business_name || "").toLowerCase();
    const email = (e.email || "").toLowerCase();
    const matchesSearch = name.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleConvertToClient = async (enq: DbIntakeSubmission) => {
    setConverting(true);
    try {
      // 1. Create client
      const { data: client, error: clientErr } = await supabase
        .from("clients")
        .insert({
          business_name: enq.business_name || enq.full_name || "New Client",
          email: enq.email,
          phone: enq.phone,
          industry: enq.business_type,
          website_url: enq.domain_name,
          notes: enq.business_description,
          status: "active",
        })
        .select()
        .single();
      if (clientErr) throw clientErr;

      // 2. Create project linked to client
      const { error: projErr } = await supabase
        .from("projects")
        .insert({
          client_id: client.id,
          project_name: `Website – ${enq.business_name || enq.full_name || "New"}`,
          project_type: "website_build",
          priority: "medium",
          stage: "enquiry_received",
          description: enq.website_goal,
        });
      if (projErr) throw projErr;

      // 3. Update intake status
      await supabase
        .from("intake_submissions")
        .update({ status: "converted" })
        .eq("id", enq.id);

      queryClient.invalidateQueries({ queryKey: ["intake_submissions"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Client & project created successfully");
      setSelected({ ...enq, status: "converted" });
    } catch (err: any) {
      toast.error(err.message || "Failed to convert");
    } finally {
      setConverting(false);
    }
  };

  const handleCreateProject = async (enq: DbIntakeSubmission) => {
    setConverting(true);
    try {
      const { error } = await supabase
        .from("projects")
        .insert({
          project_name: `Project – ${enq.business_name || enq.full_name || "New"}`,
          project_type: "website_build",
          priority: "medium",
          stage: "enquiry_received",
          description: enq.website_goal,
        });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project created");
    } catch (err: any) {
      toast.error(err.message || "Failed to create project");
    } finally {
      setConverting(false);
    }
  };

  const handleStatusChange = async (enq: DbIntakeSubmission, newStatus: string) => {
    await supabase.from("intake_submissions").update({ status: newStatus }).eq("id", enq.id);
    queryClient.invalidateQueries({ queryKey: ["intake_submissions"] });
    setSelected({ ...enq, status: newStatus });
    toast.success(`Status updated to ${newStatus}`);
  };

  // Detail view
  if (selected) {
    const enq = selected;
    return (
      <DashboardLayout>
        <div className="space-y-4 max-w-3xl">
          <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="gap-1.5 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Enquiries
          </Button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">
                {enq.full_name || enq.business_name || "Unknown"}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">{enq.email}</p>
            </div>
            <StatusBadge status={enq.status} />
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoCard icon={Building2} label="Business" value={enq.business_name} />
            <InfoCard icon={Phone} label="Phone" value={enq.phone} />
            <InfoCard icon={FileText} label="Business Type" value={enq.business_type} />
            <InfoCard icon={Globe} label="Domain" value={enq.has_domain ? enq.domain_name || "Yes" : "No"} />
            <InfoCard icon={Mail} label="Needs Email" value={enq.needs_email ? "Yes" : "No"} />
            <InfoCard icon={Image} label="Has Logo" value={enq.has_logo ? "Yes" : "No"} />
          </div>

          {enq.business_description && (
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Business Description</p>
              <p className="text-sm text-foreground">{enq.business_description}</p>
            </div>
          )}

          {enq.website_goal && (
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Website Goal</p>
              <p className="text-sm text-foreground">{enq.website_goal}</p>
            </div>
          )}

          {enq.selected_pages && (
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Selected Pages</p>
              <p className="text-sm text-foreground">{enq.selected_pages}</p>
            </div>
          )}

          {/* Status update */}
          <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Update Status</p>
            <div className="flex flex-wrap gap-2">
              {["new", "contacted", "qualified", "converted", "closed"].map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={enq.status === s ? "default" : "outline"}
                  className="capitalize rounded-xl text-xs"
                  onClick={() => handleStatusChange(enq, s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              className="gap-2 rounded-xl"
              onClick={() => handleConvertToClient(enq)}
              disabled={converting || enq.status === "converted"}
            >
              <UserPlus className="h-4 w-4" />
              {enq.status === "converted" ? "Already Converted" : "Convert to Client + Project"}
            </Button>
            <Button
              variant="outline"
              className="gap-2 rounded-xl"
              onClick={() => handleCreateProject(enq)}
              disabled={converting}
            >
              <FolderPlus className="h-4 w-4" /> Create Project Only
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // List view
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">Enquiries</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage incoming enquiries and leads.</p>
        </div>

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

        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Business</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((enq) => (
                  <tr
                    key={enq.id}
                    className="hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => setSelected(enq)}
                  >
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-foreground">{enq.full_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{enq.email}</p>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell">{enq.business_name || "—"}</td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell">{enq.business_type || "—"}</td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{new Date(enq.created_at).toLocaleDateString("en-ZA")}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={enq.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isLoading && <div className="px-4 py-12 text-center text-sm text-muted-foreground">Loading...</div>}
          {!isLoading && filtered.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">No enquiries found.</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

const InfoCard = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | null | undefined }) => (
  <div className="bg-card rounded-2xl border border-border p-3.5 shadow-sm flex items-start gap-3">
    <div className="p-2 rounded-xl bg-primary/10">
      <Icon className="h-4 w-4 text-primary" />
    </div>
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm text-foreground mt-0.5">{value || "—"}</p>
    </div>
  </div>
);

export default Enquiries;
