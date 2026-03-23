import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import type { DbClient } from "@/types/database";

export interface ClientFormData {
  business_name: string;
  trading_name: string;
  company_registration: string;
  vat_number: string;
  industry: string;
  website_url: string;
  notes: string;
  status: string;
}

const emptyForm: ClientFormData = {
  business_name: "",
  trading_name: "",
  company_registration: "",
  vat_number: "",
  industry: "",
  website_url: "",
  notes: "",
  status: "active",
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ClientFormData) => Promise<void>;
  initialData?: DbClient | null;
  loading?: boolean;
}

const statusOptions = ["active", "onboarding", "inactive"];

export const ClientFormModal = ({ open, onClose, onSubmit, initialData, loading }: Props) => {
  const [form, setForm] = useState<ClientFormData>(emptyForm);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialData) {
      setForm({
        business_name: initialData.business_name,
        trading_name: initialData.trading_name ?? "",
        company_registration: initialData.company_registration ?? "",
        vat_number: initialData.vat_number ?? "",
        industry: initialData.industry ?? "",
        website_url: initialData.website_url ?? "",
        notes: initialData.notes ?? "",
        status: initialData.status,
      });
    } else {
      setForm(emptyForm);
    }
    setError("");
  }, [initialData, open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.business_name.trim()) {
      setError("Business name is required.");
      return;
    }
    try {
      await onSubmit(form);
    } catch (err: any) {
      setError(err?.message ?? "Failed to save client.");
    }
  };

  const set = (key: keyof ClientFormData, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const isEdit = !!initialData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-2xl border border-border shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-lg font-heading font-bold text-foreground">
            {isEdit ? "Edit Client" : "Add Client"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Business Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Business Name <span className="text-destructive">*</span>
            </label>
            <input
              value={form.business_name}
              onChange={(e) => set("business_name", e.target.value)}
              placeholder="e.g. BuildPro Construction"
              className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
            />
          </div>

          {/* Trading Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Trading Name</label>
            <input
              value={form.trading_name}
              onChange={(e) => set("trading_name", e.target.value)}
              placeholder="Trading as..."
              className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
            />
          </div>

          {/* Row: Registration + VAT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Company Registration</label>
              <input
                value={form.company_registration}
                onChange={(e) => set("company_registration", e.target.value)}
                placeholder="Reg number"
                className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">VAT Number</label>
              <input
                value={form.vat_number}
                onChange={(e) => set("vat_number", e.target.value)}
                placeholder="VAT number"
                className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
          </div>

          {/* Industry */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Industry</label>
            <input
              value={form.industry}
              onChange={(e) => set("industry", e.target.value)}
              placeholder="e.g. Construction, Retail, Services"
              className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
            />
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Website URL</label>
            <input
              value={form.website_url}
              onChange={(e) => set("website_url", e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Status</label>
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              placeholder="Internal notes..."
              className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/5 rounded-xl px-3 py-2 border border-destructive/20">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-input text-sm font-medium text-foreground hover:bg-muted/40 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl gradient-brand text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity shadow-md shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEdit ? (
                "Update Client"
              ) : (
                "Add Client"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
