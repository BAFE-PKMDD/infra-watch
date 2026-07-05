"use client";

import React, { createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type AuthUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  region?: string | null;
} & Record<string, unknown>;

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

type SessionHookResult = {
  data?: { session?: unknown; user?: AuthUser } | null;
  isPending?: boolean;
  isLoading?: boolean;
  refetch?: () => Promise<unknown>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const session = authClient.useSession() as SessionHookResult;

  const user = session.data?.user ?? null;
  const isAuthenticated = Boolean(session.data?.session || user);

  const refreshAuth = async () => {
    await session.refetch?.();
  };

  const logout = async () => {
    await authClient.signOut();
    await refreshAuth();
    router.push("/sign-in");
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading: Boolean(session.isPending ?? session.isLoading),
        user,
        refreshAuth,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}