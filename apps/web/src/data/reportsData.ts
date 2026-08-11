// Reports (Phase 8, "Future" — the lowest-priority phase in the whole
// roadmap, per docs/03-deliverables.md) is deliberately the lightest of
// the five new pages: aggregate summary figures, not a row queue, and not
// implying real analytics infrastructure exists behind it yet.

export const CONVERSION = {
  rate: "34%",
  detail: "17 of 50 inquiries became bookings this month",
};

export const REVENUE = {
  total: "$8,240",
  detail: "Booking fees collected this month, across all fee groups",
};

export const TICKETING_RISK = {
  count: 2,
  detail: "Ready-to-issue bookings with same-day ticketing deadlines",
};

export const AGENT_WORKLOAD: { agent: string; open: number }[] = [
  { agent: "S. Rubin", open: 12 },
  { agent: "R. Vogel", open: 9 },
  { agent: "M. Roth", open: 8 },
  { agent: "Y. Neuman", open: 7 },
];
