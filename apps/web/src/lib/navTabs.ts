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
    | "/reports";
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
 *
 * Users lives under the Setup dropdown (components/AppShell/SetupMenu.tsx)
 * in the top utility bar, not here — per Joe's review feedback, admin
 * screens shouldn't sit as their own top-level tab next to Reports.
 */
export const NAV_TABS: NavTab[] = [
  { label: "Inbox", to: "/inbox" },
  { label: "Requests", to: "/requests" },
  { label: "Clients", to: "/clients" },
  { label: "Travellers", to: "/travellers" },
  { label: "Bookings", to: "/bookings" },
  { label: "Tickets", to: "/tickets" },
  { label: "Reports", to: "/reports" },
];
