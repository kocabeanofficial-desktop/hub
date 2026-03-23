import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Coffee, ArrowRight } from "lucide-react";

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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8 animate-fade-in">
        {/* Brand */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary">
            <Coffee className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">Koca Bean</h1>
            <p className="text-xs text-muted-foreground tracking-widest uppercase mt-1">Command Centre</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-6 space-y-4 shadow-sm">
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
                className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/5 rounded-lg px-3 py-2 border border-destructive/20">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Sign in
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            This is a private portal. Access is by invitation only.
          </p>

          {/* Demo credentials */}
          <div className="bg-muted/50 rounded-lg border border-border p-4 space-y-2">
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
                  className="block w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5"
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
