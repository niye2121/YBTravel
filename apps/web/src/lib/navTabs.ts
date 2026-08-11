export type NavTab = {
  label: string;
  to?:
    | "/"
    | "/inbox"
    | "/requests"
    | "/clients"
    | "/travellers"
    | "/bookings"
    | "/tickets"
    | "/reports"
    | "/users";
  // Hidden from the nav (in PrimaryNav) for anyone without the
  // system_administrator role. See docs/03-deliverables.md P1-18.
  adminOnly?: boolean;
};

/**
 * Primary nav tabs, in order. Home is hidden here (2026-08-11, see
 * docs/CONSULATE-AUDIT.md) — CONSULATE has no Home tab because Requests'
 * default queue already covers that job. The route and its code
 * (routes/index.tsx, data/homeData.ts) stay in the repo, just unlinked.
 * Inbox and Requests were built first; Clients/Travellers/Bookings/Tickets/
 * Reports are design/UI screens over mock data, the same pattern as Home
 * and Requests (no real backend for those entities yet). Inbox sits before
 * Requests: it's chronologically upstream of the request queue —
 * a message becomes a request, not the reverse.
 */
export const NAV_TABS: NavTab[] = [
  { label: "Inbox", to: "/inbox" },
  { label: "Requests", to: "/requests" },
  { label: "Clients", to: "/clients" },
  { label: "Travellers", to: "/travellers" },
  { label: "Bookings", to: "/bookings" },
  { label: "Tickets", to: "/tickets" },
  { label: "Reports", to: "/reports" },
  { label: "Users", to: "/users", adminOnly: true },
];
