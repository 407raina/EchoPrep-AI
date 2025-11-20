import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { clearStoredAuth, getStoredAuth, persistAuth, StoredAuth } from "@/lib/auth-storage";

type AuthUser = {
  id: string;
  email: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  initializing: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<AuthUser | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthResponse = {
  token: string;
  user: AuthUser;
};

type Props = {
  children: React.ReactNode;
};

export const AuthProvider = ({ children }: Props) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  const bootstrap = useCallback(async () => {
    const stored = getStoredAuth();
    if (!stored) {
      setUser(null);
      setInitializing(false);
      return null;
    }

    try {
      const { user: me } = await apiFetch<{ user: AuthUser }>("/api/auth/me");
      setUser(me);
      setInitializing(false);
      return me;
    } catch (error) {
      clearStoredAuth();
      setUser(null);
      setInitializing(false);
      return null;
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const handleAuthSuccess = (auth: StoredAuth) => {
    persistAuth(auth);
    setUser(auth.user);
    return auth.user;
  };

  const login = useCallback(async (email: string, password: string) => {
    try {
      const result = await apiFetch<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        skipAuth: true,
      });

      return handleAuthSuccess(result);
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    try {
      const result = await apiFetch<AuthResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        skipAuth: true,
      });

      return handleAuthSuccess(result);
    } catch (error) {
      console.error("Register error:", error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST", parseJson: false });
    } catch (error) {
      // Ignore network errors during logout
    } finally {
      clearStoredAuth();
      setUser(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    return bootstrap();
  }, [bootstrap]);

  const value = useMemo(
    () => ({ user, initializing, login, register, logout, refresh }),
    [user, initializing, login, register, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return ctx;
};

export type { AuthUser };
