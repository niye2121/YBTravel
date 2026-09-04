export type NavTab = {
  label: string;
  implementation?: {
    label: string;
    description: string;
  };
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
 * Inbox, Requests, Clients, and the core Traveller record flow are live.
 * Bookings, Tickets, and Reports remain preview screens for later phases.
 * Inbox sits before
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
  {
    label: "Bookings",
    to: "/bookings",
    implementation: {
      label: "Coming in Phase 2",
      description: "Preview data only. Booking and payment actions are not implemented yet.",
    },
  },
  {
    label: "Tickets",
    to: "/tickets",
    implementation: {
      label: "Coming in Phase 3",
      description: "Preview data only. Ticketing depends on the Sabre connection.",
    },
  },
  {
    label: "Reports",
    to: "/reports",
    implementation: {
      label: "Coming in Phase 8",
      description: "Demonstration figures only. Live reporting is not implemented yet.",
    },
  },
];
