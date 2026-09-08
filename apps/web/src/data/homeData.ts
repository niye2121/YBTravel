import { HOUR, MIN } from "../lib/time";

export type Tile = {
  key: string;
  n: number;
  label: string;
  sub: string;
  urgent?: boolean;
};

export const TILES: Tile[] = [
  { key: "needsAction", n: 9, label: "NEEDS ACTION TODAY", sub: "3 within four hours", urgent: true },
  { key: "holds", n: 3, label: "HOLDS EXPIRING", sub: "next in 4h 12m", urgent: true },
  { key: "ready", n: 2, label: "READY TO ISSUE", sub: "payment confirmed" },
  { key: "waiting", n: 5, label: "WAITING ON CLIENT", sub: "2 overdue" },
  { key: "intake", n: 2, label: "NEEDS INTAKE", sub: "from WhatsApp" },
  { key: "unassigned", n: 1, label: "UNASSIGNED", sub: "no owner set", urgent: true },
];

export type UrgentRow = {
  id: string;
  client: string;
  trip: string;
  stage: string;
  prefix?: string;
  deadline?: string;
  liveIn?: number;
  alert?: boolean;
  agent: string;
};

// All 9 match the "9 NEEDS ACTION TODAY" tile and the Requests page's
// "DUE TODAY" group (data/requestsData.ts) — same requests, same day,
// so the two screens never disagree on what "needs action today" means.
export const URGENT: UrgentRow[] = [
  { id: "R-10482", client: "Kaplan", trip: "JFK → TLV", stage: "Ready to issue",
    prefix: "Ticketing limit — TTL", liveIn: 2 * HOUR + 51 * MIN, alert: true, agent: "SR" },
  { id: "R-10486", client: "Gross", trip: "MIA → TLV", stage: "Ready to issue",
    prefix: "Ticketing limit — TTL", liveIn: 3 * HOUR + 40 * MIN, alert: true, agent: "SR" },
  { id: "R-10467", client: "Mizrahi", trip: "EWR → TLV", stage: "Proposal sent",
    prefix: "Hold expires —", liveIn: 4 * HOUR + 12 * MIN, alert: true, agent: "RV" },
  { id: "R-10402", client: "Weiss", trip: "JFK → TLV", stage: "Waiting for info",
    deadline: "Follow up — overdue 2 days", alert: true, agent: "SR" },
  { id: "R-10471", client: "Katz", trip: "LAX → TLV", stage: "Payment pending",
    deadline: "Hold expires — tomorrow 11:00 AM", agent: "RV" },
  { id: "R-10493", client: "Rosenberg", trip: "JFK → TLV", stage: "Quoted",
    deadline: "Follow up — today 6:00 PM", agent: "MR" },
  { id: "R-10455", client: "Friedman", trip: "TLV → JFK", stage: "Paid",
    deadline: "Ticketing limit — tomorrow 9:00 AM", agent: "YN" },
  { id: "R-10478", client: "Lieberman", trip: "EWR → TLV", stage: "Waiting for info",
    deadline: "Follow up — today 8:00 PM", agent: "YN" },
  { id: "R-10495", client: "Shapiro", trip: "ORD → TLV", stage: "New inquiry",
    deadline: "Follow up — today 10:00 PM", agent: "—" },
];

export type Departure = {
  client: string;
  pax: number;
  trip: string;
  flight: string;
  local: string;
  state: string;
  level: "urgent" | "warn" | "normal" | "done";
};

export const DEPARTURES: Departure[] = [
  { client: "Weinstock", pax: 3, trip: "JFK → TLV", flight: "DL 468", local: "08 Sep 19:55",
    state: "Not confirmed — 6h escalation", level: "urgent" },
  { client: "Bernstein", pax: 4, trip: "EWR → TLV", flight: "UA 090", local: "08 Sep 22:10",
    state: "Not confirmed — 12h follow-up sent", level: "warn" },
  { client: "Schwartz", pax: 2, trip: "JFK → TLV", flight: "LY 002", local: "09 Sep 00:40",
    state: "Check-in opens today", level: "normal" },
  { client: "Friedman", pax: 1, trip: "TLV → JFK", flight: "LY 007", local: "12 Sep 01:15",
    state: "Documents confirmed", level: "done" },
];

export type Alert = { level: "urgent" | "warn" | "info"; text: string };

export const ALERTS: Alert[] = [
  { level: "urgent", text: "Sabre queue 42 — 3 items require attention" },
  { level: "urgent", text: "Schedule change on LY 002, 9 Sep — affects 2 ticketed trips" },
  { level: "warn", text: "1 request unassigned for more than 4 hours" },
  { level: "info", text: "Booking-fee table effective 1 Sep is still in draft" },
];

export const QUEUE: { stage: string; n: number }[] = [
  { stage: "Waiting for info", n: 6 }, { stage: "Researching", n: 4 },
  { stage: "Quoted", n: 7 }, { stage: "Proposal sent", n: 3 },
  { stage: "Payment pending", n: 2 }, { stage: "Ready to issue", n: 2 },
];

export const ACTIVITY: { at: string; who: string; what: string }[] = [
  { at: "14:12", who: "R. Vogel", what: "issued ticket 114-2938471021 for Katz" },
  { at: "13:58", who: "System", what: "hold on R-10467 expires in 4 hours" },
  { at: "13:40", who: "M. Roth", what: "approved markup exception on R-10486" },
  { at: "13:21", who: "Y. Neuman", what: "sent proposal for R-10489 (Stern)" },
  { at: "12:55", who: "System", what: "schedule change on LY 002 — 40 minutes later" },
  { at: "12:30", who: "S. Rubin", what: "created client record for Rosenberg" },
  { at: "11:47", who: "System", what: "QuickBooks sync completed, 12 invoices" },
];

export const STATUS: [string, string, string, "ok" | "warn"][] = [
  ["Sabre", "Connected", "last call 12s ago", "ok"],
  ["QuickBooks", "Connected", "synced 11:47", "ok"],
  ["Messaging", "Manual mode", "copy-ready templates", "warn"],
  ["Background jobs", "3 queued", "no failures", "ok"],
  ["Last backup", "Today 04:00", "point-in-time enabled", "ok"],
];
