import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { User } from "@yb-travel/shared";
import { authApi } from "./api";
import { clearSession, getStoredUser, hasAdminRole, saveSession } from "./session";
import { disconnectSocket } from "./socket";

type AuthContextValue = {
  user: User | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Reactive layer over lib/session.ts — the router's beforeLoad guard reads
 * localStorage directly (it runs outside React), while components read
 * this context so the header and nav re-render immediately on login/logout
 * instead of waiting for a page navigation.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser());

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAdmin: hasAdminRole(user),
      login: async (email, password) => {
        const { token, user: loggedInUser } = await authApi.login(email, password);
        disconnectSocket();
        saveSession(token, loggedInUser);
        setUser(loggedInUser);
      },
      logout: () => {
        disconnectSocket();
        clearSession();
        setUser(null);
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
