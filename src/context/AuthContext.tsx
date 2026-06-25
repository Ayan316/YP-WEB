"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

interface User {
  id: string;
  email: string;
  full_name: string;
  terms_accepted?: boolean;
  is_suspended?: boolean;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  forceSessionClear: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const session = await authClient.getSession();
        if (session?.data) {
          setUser(session.data as any);
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const logout = useCallback(async () => {
    await authClient.logout();
    setUser(null);
    router.push("/auth");
  }, [router]);

  // Refresh-token-expired logout
  const forceSessionClear = useCallback(async () => {
    await authClient.logout();

    setUser((prev) =>
      prev ? { ...prev, profile_completion_status: 0 } : null
    );

    setUser(null);
    router.push("/auth");
  }, [router]);

  // Listen refresh-expired event
  useEffect(() => {
    const handler = () => {
      forceSessionClear();
    };

    window.addEventListener("auth:refresh-expired", handler);
    return () => window.removeEventListener("auth:refresh-expired", handler);
  }, [forceSessionClear]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    logout,
    forceSessionClear,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
