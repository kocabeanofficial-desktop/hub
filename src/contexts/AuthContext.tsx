import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type UserRole = "admin" | "client";

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  clientId?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function resolveRole(userId: string): Promise<{ role: UserRole; clientId?: string } | null> {
  // Check admin_users table
  const { data, error } = await supabase
    .from("admin_users")
    .select("role, is_active")
    .eq("user_id", userId)
    .maybeSingle();

  if (!error && data && data.is_active && data.role === "super_admin") {
    return { role: "admin" };
  }

  // Future: check client_users table for client role
  // For now, non-admin authenticated users are denied
  return null;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const buildAuthUser = useCallback(async (supabaseUser: User): Promise<AuthUser | null> => {
    const resolved = await resolveRole(supabaseUser.id);
    if (!resolved) return null;
    return {
      id: supabaseUser.id,
      email: supabaseUser.email ?? "",
      role: resolved.role,
      clientId: resolved.clientId,
    };
  }, []);

  useEffect(() => {
    // Listen for auth changes FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const authUser = await buildAuthUser(session.user);
          setUser(authUser);
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    // Then check existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const authUser = await buildAuthUser(session.user);
        setUser(authUser);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [buildAuthUser]);

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { success: false, error: error.message };
    }
    if (!data.user) {
      return { success: false, error: "Login failed." };
    }
    const authUser = await buildAuthUser(data.user);
    if (!authUser) {
      await supabase.auth.signOut();
      return { success: false, error: "Access denied. You do not have permission to access this portal." };
    }
    setUser(authUser);
    return { success: true };
  }, [buildAuthUser]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
