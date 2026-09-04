import type { User } from "@yb-travel/shared";

const TOKEN_KEY = "yb_token";
const USER_KEY = "yb_user";

/**
 * Plain (non-React) localStorage access for the logged-in session. Kept
 * separate from the AuthContext so the router's beforeLoad guard — which
 * runs outside the React tree — can read it directly without needing
 * context, and so api.ts can attach the token without importing React.
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function saveSession(token: string, user: User): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function hasAdminRole(user: User | null): boolean {
  return user?.roles.includes("system_administrator") ?? false;
}
