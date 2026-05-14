import React, { useState } from "react";
import { Mail, UserPlus, Rocket, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const WHATSAPP_NUMBER = "27600000000"; // replace with real number
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}`;

function openTawk() {
  const w = window as any;
  if (w.Tawk_API?.maximize) {
    w.Tawk_API.maximize();
  } else {
    window.open(WHATSAPP_LINK, "_blank");
  }
}

const ModalFooter = () => (
  <p className="text-xs text-muted-foreground mt-4 text-center">
    Prefer WhatsApp?{" "}
    <a
      href={WHATSAPP_LINK}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline"
    >
      Message us
    </a>
  </p>
);

/* ───────── Modal 1 — Email not working ───────── */
function EmailModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);

    const domain = email.split("@")[1] || "";
    const { error } = await supabase.from("email_settings_requests").insert({
      client_id: user?.clientId || user?.id || "",
      requesting_name:
        user?.name || "Client",
      requesting_email: user?.email || "",
      domain,
      mailbox_address: email,
      request_type: "resend_settings",
      status: "pending",
    });

    setLoading(false);
    if (error) {
      toast.error("Something went wrong — please try again.");
      return;
    }
    toast.success("Done! Check your inbox — settings are coming your way 📧");
    setEmail("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Let's fix your email 📧</DialogTitle>
          <DialogDescription>
            Tell us your email address and we'll send you the settings right
            away.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            required
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[hsl(152,97%,33%)] hover:bg-[hsl(152,97%,28%)] text-white"
          >
            {loading ? "Sending…" : "Fix It For Me"}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground text-center">
          Still stuck?{" "}
          <button
            type="button"
            onClick={openTawk}
            className="text-primary underline"
          >
            Chat with us
          </button>
        </p>
        <ModalFooter />
      </DialogContent>
    </Dialog>
  );
}

/* ───────── Modal 2 — Add staff member ───────── */
function StaffModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    staff_full_name: "",
    staff_email: "",
    staff_phone: "",
    staff_role: "",
    access_email: false,
    access_website: false,
  });
  const [loading, setLoading] = useState(false);

  const set = (key: string, val: any) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.staff_full_name || !form.staff_email) return;
    setLoading(true);

    const { error } = await supabase.from("staff_authorizations").insert({
      client_id: user?.clientId || user?.id || "",
      owner_name: user?.name || "Client",
      owner_email: user?.email || "",
      staff_full_name: form.staff_full_name,
      staff_email: form.staff_email,
      staff_phone: form.staff_phone || null,
      staff_role: form.staff_role || null,
      access_email: form.access_email,
      access_website: form.access_website,
      access_cpanel: false,
      status: "pending_owner_confirm",
    });

    setLoading(false);
    if (error) {
      toast.error("Something went wrong — please try again.");
      return;
    }
    toast.success(
      "Done! We've sent you a confirmation email. Click the link in it to approve 👍"
    );
    setForm({
      staff_full_name: "",
      staff_email: "",
      staff_phone: "",
      staff_role: "",
      access_email: false,
      access_website: false,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">
            Add someone to your account 👤
          </DialogTitle>
          <DialogDescription>
            Fill in their details below. We'll send you a quick confirmation,
            and then we'll set them up.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            required
            placeholder="Their name"
            value={form.staff_full_name}
            onChange={(e) => set("staff_full_name", e.target.value)}
          />
          <Input
            required
            type="email"
            placeholder="Their email"
            value={form.staff_email}
            onChange={(e) => set("staff_email", e.target.value)}
          />
          <Input
            placeholder="Their phone number"
            value={form.staff_phone}
            onChange={(e) => set("staff_phone", e.target.value)}
          />
          <Input
            placeholder="Their job title"
            value={form.staff_role}
            onChange={(e) => set("staff_role", e.target.value)}
          />
          <div className="flex flex-col gap-2 pt-1">
            <div className="flex items-center gap-2">
              <Checkbox
                id="access_email"
                checked={form.access_email}
                onCheckedChange={(v) => set("access_email", !!v)}
              />
              <Label htmlFor="access_email" className="text-sm">
                Email access
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="access_website"
                checked={form.access_website}
                onCheckedChange={(v) => set("access_website", !!v)}
              />
              <Label htmlFor="access_website" className="text-sm">
                Website access
              </Label>
            </div>
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
          >
            {loading ? "Sending…" : "Add Them"}
          </Button>
        </form>
        <ModalFooter />
      </DialogContent>
    </Dialog>
  );
}

/* ───────── Modal 3 — Upgrade website ───────── */
const PLATFORM_OPTIONS = [
  { label: "I don't know", value: "unknown" },
  { label: "Old website builder", value: "wysiwyg" },
  { label: "Mobirise", value: "mobirise" },
  { label: "WordPress", value: "wordpress" },
  { label: "I don't have a website", value: "none" },
];

function UpgradeModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    business_description: "",
    current_website_url: "",
    current_platform: "unknown",
    goals: "",
  });
  const [loading, setLoading] = useState(false);

  const set = (key: string, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.business_description) return;
    setLoading(true);

    const { error } = await supabase.from("upgrade_requests").insert({
      client_id: user?.clientId || user?.id || "",
      submitter_name: user?.name || "Client",
      submitter_email: user?.email || "",
      business_description: form.business_description,
      current_website_url: form.current_website_url || null,
      current_platform: form.current_platform,
      goals: form.goals || null,
      upgrade_type: "ai_website",
      status: "new",
    });

    setLoading(false);
    if (error) {
      toast.error("Something went wrong — please try again.");
      return;
    }
    toast.success(
      "Lekker! Our team will WhatsApp or call you within 1 working day 🎉"
    );
    setForm({
      business_description: "",
      current_website_url: "",
      current_platform: "unknown",
      goals: "",
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">
            Get a better website 🚀
          </DialogTitle>
          <DialogDescription>
            Our new AI websites look great and work perfectly on phones. Tell us
            a bit about your business and we'll be in touch.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            required
            placeholder="What does your business do?"
            value={form.business_description}
            onChange={(e) => set("business_description", e.target.value)}
            rows={3}
          />
          <Input
            placeholder="What is your current website? (optional)"
            value={form.current_website_url}
            onChange={(e) => set("current_website_url", e.target.value)}
          />
          <Select
            value={form.current_platform}
            onValueChange={(v) => set("current_platform", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="What system is your current site on?" />
            </SelectTrigger>
            <SelectContent>
              {PLATFORM_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="What do you want your website to do?"
            value={form.goals}
            onChange={(e) => set("goals", e.target.value)}
            rows={3}
          />
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] hover:opacity-90 text-white"
          >
            {loading ? "Sending…" : "I Want This 🚀"}
          </Button>
        </form>
        <ModalFooter />
      </DialogContent>
    </Dialog>
  );
}

/* ───────── Main Section ───────── */
export function NeedHelpSection() {
  const [emailOpen, setEmailOpen] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  return (
    <>
      <div className="space-y-3">
        <h2 className="text-sm font-heading font-semibold text-muted-foreground">
          Need help?
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Button 1 */}
          <button
            onClick={() => setEmailOpen(true)}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl p-4 bg-[#03A84E] text-white shadow-sm hover:opacity-90 transition-opacity text-center"
          >
            <Mail className="h-5 w-5" />
            <span className="text-sm font-medium leading-tight">
              Email not working?
            </span>
          </button>

          {/* Button 2 */}
          <button
            onClick={() => setStaffOpen(true)}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl p-4 bg-[#2563EB] text-white shadow-sm hover:opacity-90 transition-opacity text-center"
          >
            <UserPlus className="h-5 w-5" />
            <span className="text-sm font-medium leading-tight">
              Add a staff member
            </span>
          </button>

          {/* Button 3 */}
          <button
            onClick={() => setUpgradeOpen(true)}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl p-4 bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] text-white shadow-sm hover:opacity-90 transition-opacity text-center"
          >
            <Rocket className="h-5 w-5" />
            <span className="text-sm font-medium leading-tight">
              Upgrade my website
            </span>
          </button>

          {/* Button 4 */}
          <button
            onClick={openTawk}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl p-4 bg-card text-foreground border border-border shadow-sm hover:bg-muted/50 transition-colors text-center"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm font-medium leading-tight">
              Chat with us
            </span>
          </button>
        </div>
      </div>

      <EmailModal open={emailOpen} onClose={() => setEmailOpen(false)} />
      <StaffModal open={staffOpen} onClose={() => setStaffOpen(false)} />
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </>
  );
}
