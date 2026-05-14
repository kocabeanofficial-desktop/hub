import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type InviteStatus = "loading" | "valid" | "invalid" | "accepted" | "submitting";

const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<InviteStatus>("loading");
  const [invite, setInvite] = useState<{ id: string; email: string; client_id: string } | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    const checkToken = async () => {
      const { data, error } = await supabase.functions.invoke("send-client-invite", {
        body: { action: "validate", token },
      });

      if (error || !data?.valid) {
        setStatus("invalid");
        return;
      }

      setInvite({ id: data.id, email: data.email, client_id: data.client_id });
      setStatus("valid");
    };

    checkToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setStatus("submitting");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("send-client-invite", {
        body: { action: "accept", token, password },
      });

      if (fnError || (data && data.error)) {
        setError(data?.error || fnError?.message || "Failed to set up account.");
        setStatus("valid");
        return;
      }

      setStatus("accepted");
      toast.success("Account set up successfully!");

      // Sign in with the new password
      if (invite) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: invite.email,
          password,
        });

        if (!signInError) {
          setTimeout(() => navigate("/client"), 1500);
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("valid");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 sm:p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-xl font-heading font-extrabold text-foreground">Koca Bean</h1>
            <p className="text-sm text-muted-foreground mt-1">Client Portal</p>
          </div>

          {status === "loading" && (
            <div className="text-center py-8 space-y-3">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">Verifying your invite…</p>
            </div>
          )}

          {status === "invalid" && (
            <div className="text-center py-8 space-y-3">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
              <p className="text-sm font-medium text-foreground">Invite Invalid</p>
              <p className="text-sm text-muted-foreground">
                This invite link has expired or is invalid. Please contact Koca Bean.
              </p>
            </div>
          )}

          {status === "accepted" && (
            <div className="text-center py-8 space-y-3">
              <CheckCircle2 className="h-8 w-8 text-primary mx-auto" />
              <p className="text-sm font-medium text-foreground">Account Created!</p>
              <p className="text-sm text-muted-foreground">Redirecting to your dashboard…</p>
            </div>
          )}

          {(status === "valid" || status === "submitting") && invite && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Set up your account</p>
                <p className="text-xs text-muted-foreground mt-1">{invite.email}</p>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <div className="grid gap-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Choose a password"
                  disabled={status === "submitting"}
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="confirm">Confirm Password</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  disabled={status === "submitting"}
                />
              </div>

              <Button type="submit" className="w-full" disabled={status === "submitting"}>
                {status === "submitting" && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                Create Account
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AcceptInvite;
