import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Globe } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const success = login(email);
    if (success) {
      const user = email.toLowerCase().includes("admin") ? "/admin" : "/client";
      navigate(user);
    } else {
      setError("Access denied. This portal is invite-only.");
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-brand shadow-lg shadow-primary/20">
            <Globe className="h-8 w-8 text-primary-foreground" />
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

            {error && (
              <p className="text-sm text-destructive bg-destructive/5 rounded-xl px-3 py-2 border border-destructive/20">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 gradient-brand text-primary-foreground rounded-xl py-3 text-sm font-semibold hover:opacity-90 transition-opacity shadow-md shadow-primary/20"
            >
              Sign in
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            This is a private portal. Access is by invitation only.
          </p>

          {/* Demo credentials */}
          <div className="bg-card/60 backdrop-blur-sm rounded-xl border border-border p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Demo accounts:</p>
            <div className="space-y-1">
              {[
                { label: "Admin", email: "admin@kocabean.co.za" },
                { label: "Client", email: "john@buildpro.co.za" },
              ].map((demo) => (
                <button
                  key={demo.email}
                  type="button"
                  onClick={() => setEmail(demo.email)}
                  className="block w-full text-left text-xs text-muted-foreground hover:text-primary transition-colors py-0.5"
                >
                  <span className="font-medium">{demo.label}:</span> {demo.email}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
