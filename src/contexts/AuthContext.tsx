import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type UserRole = "admin" | "client";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface AuthContextType {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function resolveAppUser(supaUser: User): Promise<AppUser> {
  // Check admin_users table
  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("role, is_active, display_name")
    .eq("user_id", supaUser.id)
    .maybeSingle();

  if (adminRow && adminRow.is_active && adminRow.role === "super_admin") {
    return {
      id: supaUser.id,
      email: supaUser.email ?? "",
      name: adminRow.display_name || supaUser.email?.split("@")[0] || "Admin",
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

  useEffect(() => {
    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const appUser = await resolveAppUser(session.user);
        setUser(appUser);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    // Then restore session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const appUser = await resolveAppUser(session.user);
        setUser(appUser);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { success: false, error: error.message };
    }
    if (data.user) {
      const appUser = await resolveAppUser(data.user);
      setUser(appUser);
    }
    return { success: true };
  }, []);

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
