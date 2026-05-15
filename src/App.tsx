import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Enquiries from "./pages/admin/Enquiries";
import Clients from "./pages/admin/Clients";
import ClientDetail from "./pages/admin/ClientDetail";
import Projects from "./pages/admin/Projects";
import Support from "./pages/admin/Support";
import SEOTracking from "./pages/admin/SEOTracking";
import Reports from "./pages/admin/Reports";
import TaskManager from "./pages/admin/TaskManager";
import Hosting from "./pages/admin/Hosting";
import ZohoImports from "./pages/admin/ZohoImports";
import ActivityLog from "./pages/admin/ActivityLog";
import WebsiteContent from "./pages/admin/WebsiteContent";
import PageContentEditor from "./pages/admin/PageContentEditor";
import ClientDashboard from "./pages/client/ClientDashboard";
import ClientProjects from "./pages/client/ClientProjects";
import ClientSupport from "./pages/client/ClientSupport";
import ClientReports from "./pages/client/ClientReports";
import AcceptInvite from "./pages/AcceptInvite";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const FullPageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center space-y-3">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  </div>
);

const FullPageAuthError = ({ message }: { message: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-background px-6">
    <div className="max-w-md text-center space-y-3">
      <p className="text-sm font-semibold text-foreground">Authentication error</p>
      <p className="text-sm text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="text-sm font-medium text-primary hover:underline"
      >
        Retry
      </button>
    </div>
  </div>
);

const ProtectedRoute = ({ children, role }: { children: React.ReactNode; role?: string }) => {
  const { isAuthenticated, isLoading, user, authError } = useAuth();
  if (isLoading) return <FullPageLoader />;
  if (authError) return <FullPageAuthError message={authError} />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role && user?.role !== role) return <Navigate to={user?.role === "admin" ? "/admin" : "/client"} replace />;
  return <>{children}</>;
};

const LoginRoute = () => {
  const { isAuthenticated, isLoading, user, authError } = useAuth();
  if (isLoading) return <FullPageLoader />;
  if (authError) return <FullPageAuthError message={authError} />;
  if (isAuthenticated) return <Navigate to={user?.role === "admin" ? "/admin" : "/client"} replace />;
  return <Login />;
};

const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/accept-invite" element={<AcceptInvite />} />
            {/* Admin routes */}
            <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/enquiries" element={<ProtectedRoute role="admin"><Enquiries /></ProtectedRoute>} />
            <Route path="/admin/clients" element={<ProtectedRoute role="admin"><Clients /></ProtectedRoute>} />
            <Route path="/admin/clients/:clientId" element={<ProtectedRoute role="admin"><ClientDetail /></ProtectedRoute>} />
            <Route path="/admin/projects" element={<ProtectedRoute role="admin"><Projects /></ProtectedRoute>} />
            <Route path="/admin/projects/:projectId" element={<ProtectedRoute role="admin"><Projects /></ProtectedRoute>} />
            <Route path="/admin/support" element={<ProtectedRoute role="admin"><Support /></ProtectedRoute>} />
            <Route path="/admin/tasks" element={<ProtectedRoute role="admin"><TaskManager /></ProtectedRoute>} />
            <Route path="/admin/seo" element={<ProtectedRoute role="admin"><SEOTracking /></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute role="admin"><Reports /></ProtectedRoute>} />
            <Route path="/admin/hosting" element={<ProtectedRoute role="admin"><Hosting /></ProtectedRoute>} />
            <Route path="/admin/imports" element={<ProtectedRoute role="admin"><ZohoImports /></ProtectedRoute>} />
            <Route path="/admin/activity" element={<ProtectedRoute role="admin"><ActivityLog /></ProtectedRoute>} />
            <Route path="/admin/websites/:websiteId/content" element={<ProtectedRoute role="admin"><WebsiteContent /></ProtectedRoute>} />
            <Route path="/admin/websites/:websiteId/content/:pageId" element={<ProtectedRoute role="admin"><PageContentEditor /></ProtectedRoute>} />
            {/* Client routes — accessible to any authenticated user (admins included for testing) */}
            <Route path="/client" element={<ProtectedRoute><ClientDashboard /></ProtectedRoute>} />
            <Route path="/client/projects" element={<ProtectedRoute><ClientProjects /></ProtectedRoute>} />
            <Route path="/client/support" element={<ProtectedRoute><ClientSupport /></ProtectedRoute>} />
            <Route path="/client/reports" element={<ProtectedRoute><ClientReports /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
