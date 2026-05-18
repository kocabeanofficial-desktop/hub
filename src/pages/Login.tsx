import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, Mail, KeyRound } from "lucide-react";
import kocaBeanLogo from "@/assets/koca-bean-logo.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [showPasswordFallback, setShowPasswordFallback] = useState(false);
  const { login, sendOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();

  // OTP flow: step 1 — send code
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError("Please enter your email address."); return; }
    setError("");
    setLoading(true);
    const result = await sendOtp(email);
    setLoading(false);
    if (result.success) {
      setOtpSent(true);
    } else {
      setError(result.error || "Failed to send login code. Please try again.");
    }
  };

  // OTP flow: step 2 — verify code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode) { setError("Please enter the 6-digit code from your email."); return; }
    setError("");
    setLoading(true);
    const result = await verifyOtp(email, otpCode);
    setLoading(false);
    if (result.success) {
      navigate("/client");
    } else {
      setError(result.error || "Invalid or expired code. Please try again.");
    }
  };

  // Password fallback
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      navigate("/admin");
    } else {
      setError(result.error || "Invalid email or password.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, hsl(160 20% 97%) 0%, hsl(170 25% 94%) 50%, hsl(165 20% 96%) 100%)" }}>
      {/* Subtle brand orbs */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.06]"
        style={{ background: "radial-gradient(circle, hsl(168 65% 38%), transparent 70%)" }} />
      <div className="absolute bottom-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.04]"
        style={{ background: "radial-gradient(circle, hsl(152 60% 45%), transparent 70%)" }} />

      <div className="w-full max-w-sm space-y-8 animate-fade-in-up relative z-10">
        {/* Brand */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20">
            <img src={kocaBeanLogo} alt="Koca Bean" className="w-20 h-20 object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-extrabold gradient-brand-text">Koca Bean</h1>
            <p className="text-xs text-muted-foreground tracking-[0.2em] uppercase mt-1.5 font-medium">Command Centre</p>
          </div>
        </div>

        {!showPasswordFallback ? (
          <>
            {!otpSent ? (
              /* Step 1: Enter email and request OTP */
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="bg-card rounded-2xl border border-border p-6 space-y-4 shadow-sm">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-destructive bg-destructive/5 rounded-lg px-3 py-2">{error}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  {loading ? "Sending code..." : "Send login code"}
                </button>
                <p className="text-center text-xs text-muted-foreground">
                  <button type="button" onClick={() => setShowPasswordFallback(true)} className="underline hover:text-foreground transition-colors">
                    Sign in with password instead
                  </button>
                </p>
              </form>
            ) : (
              /* Step 2: Enter OTP code */
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="bg-card rounded-2xl border border-border p-6 space-y-4 shadow-sm">
                  <p className="text-sm text-muted-foreground text-center">
                    A 6-digit code was sent to <span className="font-medium text-foreground">{email}</span>
                  </p>
                  <div>
                    <label htmlFor="otp" className="block text-sm font-medium text-foreground mb-1.5">
                      Login code
                    </label>
                    <input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="000000"
                      required
                      autoFocus
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm tracking-[0.4em] text-center focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-destructive bg-destructive/5 rounded-lg px-3 py-2">{error}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <KeyRound className="w-4 h-4" />
                  )}
                  {loading ? "Verifying..." : "Verify code"}
                  {!loading && <ArrowRight className="w-4 h-4 ml-auto" />}
                </button>
                <p className="text-center text-xs text-muted-foreground">
                  <button type="button" onClick={() => { setOtpSent(false); setOtpCode(""); setError(""); }} className="underline hover:text-foreground transition-colors">
                    Use a different email
                  </button>
                  {" · "}
                  <button type="button" onClick={handleSendOtp as any} className="underline hover:text-foreground transition-colors">
                    Resend code
                  </button>
                </p>
              </form>
            )}
          </>
        ) : (
          /* Password fallback */
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div className="bg-card rounded-2xl border border-border p-6 space-y-4 shadow-sm">
              <div>
                <label htmlFor="email-pw" className="block text-sm font-medium text-foreground mb-1.5">
                  Email address
                </label>
                <input
                  id="email-pw"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive bg-destructive/5 rounded-lg px-3 py-2">{error}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? "Signing in..." : "Sign in"}
              {!loading && <ArrowRight className="w-4 h-4 ml-auto" />}
            </button>
            <p className="text-center text-xs text-muted-foreground">
              <button type="button" onClick={() => { setShowPasswordFallback(false); setError(""); }} className="underline hover:text-foreground transition-colors">
                Use email code instead
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import kocaBeanLogo from "@/assets/koca-bean-logo.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      // Navigation will be handled by LoginRoute redirect in App.tsx
      // but we can also navigate explicitly
      navigate("/admin");
    } else {
      setError(result.error || "Invalid email or password.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, hsl(160 20% 97%) 0%, hsl(170 25% 94%) 50%, hsl(165 20% 96%) 100%)" }}>
      {/* Subtle brand orbs */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.06]"
        style={{ background: "radial-gradient(circle, hsl(168 65% 38%), transparent 70%)" }} />
      <div className="absolute bottom-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.04]"
        style={{ background: "radial-gradient(circle, hsl(152 60% 45%), transparent 70%)" }} />

      <div className="w-full max-w-sm space-y-8 animate-fade-in-up relative z-10">
        {/* Brand */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20">
            <img src={kocaBeanLogo} alt="Koca Bean" className="w-20 h-20 object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-extrabold gradient-brand-text">Koca Bean</h1>
            <p className="text-xs text-muted-foreground tracking-[0.2em] uppercase mt-1.5 font-medium">Command Centre</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-card rounded-2xl border border-border p-6 space-y-4 shadow-sm">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.co.za"
                required
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/5 rounded-xl px-3 py-2 border border-destructive/20">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 gradient-brand text-primary-foreground rounded-xl py-3 text-sm font-semibold hover:opacity-90 transition-opacity shadow-md shadow-primary/20 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            This is a private portal. Access is by invitation only.
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
