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
      navigate("/admin");
    } else {
      setError(result.error ?? "Login failed.");
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
                placeholder="you@kocabean.co.za"
                required
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition disabled:opacity-50"
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
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition disabled:opacity-50"
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
              className="w-full flex items-center justify-center gap-2 gradient-brand text-primary-foreground rounded-xl py-3 text-sm font-semibold hover:opacity-90 transition-opacity shadow-md shadow-primary/20 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
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
