export type TicketStatus = "Active" | "Pending Reissue" | "Refund in Progress";

export type TicketRow = {
  id: string;
  client: string;
  trip: string;
  issueDate: string;
  fare: number;
  status: TicketStatus;
};

const money = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// This is a mock preview, not live Sabre data — Phase 3 (docs/03-deliverables.md)
// is gated on Sabre access being commercially confirmed per CLAUDE.md's
// sequencing rule. Schwartz's entry matches its "Ticket issued" stage in
// data/bookingsData.ts; the reissue/refund examples represent separate,
// older trips for repeat clients rather than contradicting their current
// booking stage.
export const TICKETS: TicketRow[] = [
  { id: "TKT-6001", client: "Schwartz", trip: "JFK → TLV · 18 Aug", issueDate: "Today", fare: 2340, status: "Active" },
  { id: "TKT-6002", client: "Katz", trip: "LAX → TLV · 12 Jun – 28 Jun", issueDate: "2 weeks ago", fare: 4890, status: "Active" },
  { id: "TKT-6003", client: "Rosenberg", trip: "JFK → TLV · 3 May – 20 May", issueDate: "1 month ago", fare: 5410, status: "Active" },
  { id: "TKT-6004", client: "Berkowitz", trip: "EWR → TLV · 14 Apr – 2 May", issueDate: "6 weeks ago", fare: 6200, status: "Active" },
  { id: "TKT-6005", client: "Mizrahi", trip: "EWR → TLV · 3 Oct – 21 Oct", issueDate: "3 days ago", fare: 9240, status: "Pending Reissue" },
  { id: "TKT-6006", client: "Gross", trip: "MIA → TLV · 19 Jul – 4 Aug", issueDate: "1 week ago", fare: 3120, status: "Refund in Progress" },
];

export const TICKET_FILTERS: [string, number][] = [
  ["All Tickets", TICKETS.length],
  ["Issued", TICKETS.filter((t) => t.status === "Active").length],
  ["Pending Reissue", TICKETS.filter((t) => t.status === "Pending Reissue").length],
  ["Void/Refund in Progress", TICKETS.filter((t) => t.status === "Refund in Progress").length],
];

export { money };
