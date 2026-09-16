"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, getToken, Locale, setToken, setUnauthorizedHandler, User } from "./api";

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string, locale: Locale) => Promise<void>;
  logout: () => void;
  updateProfile: (changes: Partial<Pick<User, "display_name" | "locale">>) => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

async function loadCurrentUser(): Promise<User | null> {
  if (!getToken()) return null;
  try {
    return await api<User>("/auth/me");
  } catch {
    setToken(null);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    let cancelled = false;
    loadCurrentUser().then((me) => {
      if (cancelled) return;
      setUser(me);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [logout]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      logout,
      async login(email, password) {
        const res = await api<{ token: string; user: User }>("/auth/login", { method: "POST", json: { email, password } });
        setToken(res.token);
        setUser(res.user);
      },
      async register(email, password, display_name, locale) {
        const res = await api<{ token: string; user: User }>("/auth/register", {
          method: "POST",
          json: { email, password, display_name, locale },
        });
        setToken(res.token);
        setUser(res.user);
      },
      async updateProfile(changes) {
        setUser(await api<User>("/auth/me", { method: "PATCH", json: changes }));
      },
    }),
    [user, loading, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
