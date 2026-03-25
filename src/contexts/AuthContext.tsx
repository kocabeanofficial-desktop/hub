import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type UserRole = "admin" | "client";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  clientId?: string;
}

interface AuthContextType {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_LOOKUP_TIMEOUT_MS = 8000;

const withTimeout = (operation: () => PromiseLike<any>, timeoutMs: number, timeoutMessage: string): Promise<any> =>
  new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);

    Promise.resolve(operation())
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeoutId));
  });

async function resolveAppUser(supaUser: User): Promise<AppUser> {
  const { data: adminRow, error: adminLookupError } = await withTimeout(
    () =>
      supabase
        .from("admin_users")
        .select("role, is_active")
        .eq("user_id", supaUser.id)
        .maybeSingle(),
    ADMIN_LOOKUP_TIMEOUT_MS,
    "Admin access check timed out. Please refresh and try again."
  );

  if (adminLookupError) {
    throw new Error("Could not verify admin permissions. Please try again.");
  }

  if (adminRow && adminRow.is_active && adminRow.role === "super_admin") {
    return {
      id: supaUser.id,
      email: supaUser.email ?? "",
      name: supaUser.email?.split("@")[0] || "Admin",
      role: "admin",
    };
  }

  // Default: deny access (no client portal without explicit setup)
  // For now treat non-admin authenticated users as having no valid role
  return {
    id: supaUser.id,
    email: supaUser.email ?? "",
    name: supaUser.user_metadata?.full_name || supaUser.email?.split("@")[0] || "User",
    role: "client",
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const authRequestId = useRef(0);

  const hydrateFromSession = useCallback(async (session: Session | null) => {
    const requestId = ++authRequestId.current;
    setIsLoading(true);
    setAuthError(null);

    if (!session?.user) {
      if (requestId !== authRequestId.current) return;
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const appUser = await resolveAppUser(session.user);
      if (requestId !== authRequestId.current) return;
      setUser(appUser);
    } catch (error) {
      if (requestId !== authRequestId.current) return;
      setUser(null);
      setAuthError(error instanceof Error ? error.message : "Unable to verify account access.");
    } finally {
      if (requestId === authRequestId.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void hydrateFromSession(session);
    });

    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          setUser(null);
          setAuthError("Failed to restore your session. Please sign in again.");
          setIsLoading(false);
          return;
        }
        void hydrateFromSession(session);
      })
      .catch(() => {
        setUser(null);
        setAuthError("Failed to restore your session. Please sign in again.");
        setIsLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [hydrateFromSession]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setAuthError(null);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setIsLoading(false);
      return { success: false, error: error.message };
    }

    if (data.session) {
      await hydrateFromSession(data.session);
    } else {
      setIsLoading(false);
    }

    return { success: true };
  }, [hydrateFromSession]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    setAuthError(null);
    await supabase.auth.signOut();
    setUser(null);
    setIsLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, authError, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
