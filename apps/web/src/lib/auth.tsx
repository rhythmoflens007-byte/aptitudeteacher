"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, ApiError, getToken, Locale, setToken, setUnauthorizedHandler, User } from "./api";

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string, locale: Locale) => Promise<void>;
  logout: () => void;
  updateProfile: (changes: Partial<Pick<User, "display_name" | "locale" | "tutor_name" | "tutor_gender">>) => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

const RETRY_MS = 3000;

/** The signed-in user, null if signed out, or "retry" when the server can't be reached right now. */
async function loadCurrentUser(): Promise<User | null | "retry"> {
  if (!getToken()) return null;
  try {
    return await api<User>("/auth/me");
  } catch (e) {
    // Only a rejected session signs you out; a network blip or server restart keeps it.
    if (e instanceof ApiError && e.status === 401) {
      setToken(null);
      return null;
    }
    return "retry";
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
    let timer = 0;
    const attempt = () =>
      loadCurrentUser().then((me) => {
        if (cancelled) return;
        if (me === "retry") {
          timer = window.setTimeout(attempt, RETRY_MS);
          return;
        }
        setUser(me);
        setLoading(false);
      });
    void attempt();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
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
