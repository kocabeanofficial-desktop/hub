import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, FolderOpen, MessageSquare, FileText,
  Activity, Search, Settings, LogOut, Menu, X, Coffee, Inbox, BarChart3,
} from "lucide-react";

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

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sidebar-primary">
            <Coffee className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-heading font-bold text-sidebar-foreground">Koca Bean</h1>
            <p className="text-[10px] text-sidebar-muted tracking-wider uppercase">Command Centre</p>
          </div>
          <button className="ml-auto lg:hidden text-sidebar-muted" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-1">
          {nav.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-4.5 w-4.5 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="border-t border-sidebar-border px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-xs font-semibold text-sidebar-foreground">
                {user?.name?.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</p>
              <p className="text-xs text-sidebar-muted capitalize">{user?.role}</p>
            </div>
            <button onClick={handleLogout} className="text-sidebar-muted hover:text-sidebar-foreground">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center gap-4 px-4 sm:px-6 py-3 border-b border-border bg-card">
          <button className="lg:hidden text-muted-foreground" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <span className="text-xs text-muted-foreground hidden sm:block">
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
