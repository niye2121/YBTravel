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
 * Primary nav tabs, in order. All eight are now real routes — Home and
 * Inbox and Requests were built first; Clients/Travellers/Bookings/Tickets/
 * Reports are design/UI screens over mock data, the same pattern as Home
 * and Requests (no real backend for those entities yet). Inbox sits between
 * Home and Requests: it's chronologically upstream of the request queue —
 * a message becomes a request, not the reverse.
 */
export const NAV_TABS: NavTab[] = [
  { label: "Home", to: "/" },
  { label: "Inbox", to: "/inbox" },
  { label: "Requests", to: "/requests" },
  { label: "Clients", to: "/clients" },
  { label: "Travellers", to: "/travellers" },
  { label: "Bookings", to: "/bookings" },
  { label: "Tickets", to: "/tickets" },
  { label: "Reports", to: "/reports" },
];
