import type { StaffPermission, User } from "@yb-travel/shared";

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
  return hasPermission(user, "users.manage") || hasPermission(user, "settings.manage") || hasPermission(user, "integrations.manage") || hasPermission(user, "whatsapp.manage_accounts");
}

/**
 * Mirrors an API permission check for navigation and action visibility. The
 * backend remains authoritative; the role fallback only supports old browser
 * sessions until their next login refreshes the stored user shape.
 */
export function hasPermission(user: User | null, permission: StaffPermission): boolean {
  if (!user) return false;
  if (Array.isArray(user.permissions)) return user.permissions.includes(permission);
  return user.roles.includes("system_administrator");
}
