import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, FolderOpen, MessageSquare, FileText,
  Activity, Search, LogOut, Menu, X, Inbox, CheckSquare,
} from "lucide-react";
import kocaBeanLogo from "@/assets/koca-bean-logo.png";

const adminNav = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { label: "Enquiries", path: "/admin/enquiries", icon: Inbox },
  { label: "Clients", path: "/admin/clients", icon: Users },
  { label: "Projects", path: "/admin/projects", icon: FolderOpen },
  { label: "Support", path: "/admin/support", icon: MessageSquare },
  { label: "SEO Tracking", path: "/admin/seo", icon: Search },
  { label: "Reports", path: "/admin/reports", icon: FileText },
  { label: "Activity Log", path: "/admin/activity", icon: Activity },
];

const clientNav = [
  { label: "Dashboard", path: "/client", icon: LayoutDashboard },
  { label: "Projects", path: "/client/projects", icon: FolderOpen },
  { label: "Support", path: "/client/support", icon: MessageSquare },
  { label: "Reports", path: "/client/reports", icon: FileText },
];

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const nav = user?.role === "admin" ? adminNav : clientNav;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center justify-center w-9 h-9">
            <img src={kocaBeanLogo} alt="Koca Bean" className="w-9 h-9 object-contain" />
          </div>
          <div>
            <h1 className="text-sm font-heading font-bold text-sidebar-foreground tracking-tight">Koca Bean</h1>
            <p className="text-[10px] text-sidebar-muted tracking-[0.15em] uppercase">Command Centre</p>
          </div>
          <button className="ml-auto lg:hidden text-sidebar-muted hover:text-sidebar-foreground" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-0.5">
          {nav.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-sidebar-primary/15 text-sidebar-primary border border-sidebar-primary/20"
                    : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground border border-transparent"
                )}
              >
                <item.icon className={cn("h-[18px] w-[18px] flex-shrink-0", isActive && "text-sidebar-primary")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="border-t border-sidebar-border px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center shadow-sm">
              <span className="text-xs font-bold text-primary-foreground">
                {user?.name?.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</p>
              <p className="text-xs text-sidebar-muted capitalize">{user?.role}</p>
            </div>
            <button onClick={handleLogout} className="text-sidebar-muted hover:text-sidebar-foreground transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center gap-4 px-4 sm:px-6 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
          <button className="lg:hidden text-muted-foreground hover:text-foreground transition-colors" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <span className="text-xs text-muted-foreground hidden sm:block font-medium">
            {new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </span>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
