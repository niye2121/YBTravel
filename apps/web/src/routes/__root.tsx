import { Outlet, createRootRoute, redirect } from "@tanstack/react-router";
import { getStoredUser } from "../lib/session";

/**
 * Runs before every route match. beforeLoad is outside the React tree, so
 * it reads the session straight from localStorage (lib/session.ts) rather
 * than from AuthContext. Anyone without a stored session gets sent to
 * /login, except when they're already headed there.
 */
export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    if (location.pathname === "/login") return;
    if (!getStoredUser()) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  component: () => <Outlet />,
});
