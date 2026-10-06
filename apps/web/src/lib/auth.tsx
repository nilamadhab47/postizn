"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, type Me } from "@/lib/api";
import { identifyUser, resetUser, track } from "@/lib/analytics";

type AuthContextValue = {
  user: Me | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const refresh = useCallback(async () => {
    try {
      const me = await api<Me>("/auth/me");
      setUser(me);
    } catch {
      setUser(null);
      const path = pathnameRef.current;
      if (path !== "/login" && path !== "/") {
        router.replace("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  const logout = useCallback(async () => {
    track("user_logged_out");
    resetUser();
    await api("/auth/logout", { method: "POST" });
    setUser(null);
    router.replace("/login");
  }, [router]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (user) identifyUser(user);
  }, [user]);

  const value = useMemo(
    () => ({ user, loading, refresh, logout }),
    [user, loading, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
