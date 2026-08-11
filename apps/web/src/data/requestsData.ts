import { HOUR, MIN } from "../lib/time";

export type RequestRow = {
  id: string;
  client: string;
  trip: string;
  stage: string;
  waitWho: "Us" | "Client";
  waitWhat: string;
  fare?: number;
  fareText?: string;
  agent: string;
  alert?: boolean;
  deadline?: string;
  deadlinePrefix?: string;
  liveIn?: number;
};

export type RequestGroup = {
  key: string;
  label: string;
  urgent?: boolean;
  items: RequestRow[];
};

// liveIn: milliseconds remaining, drives the countdown in the label.
// Rows without liveIn use their static deadline string.
export const GROUPS: RequestGroup[] = [
  {
    key: "today",
    label: "DUE TODAY — 9 REQUESTS, 3 WITHIN FOUR HOURS",
    urgent: true,
    items: [
      {
        id: "R-10482", client: "Kaplan", trip: "JFK → TLV · 14 Aug – 2 Sep",
        stage: "Ready to issue", waitWho: "Us", waitWhat: "ticketing limit, EL AL",
        fare: 4187.36, agent: "SR", alert: true,
        deadlinePrefix: "Ticketing limit — today 3:20 PM, TTL", liveIn: 2 * HOUR + 51 * MIN,
      },
      {
        id: "R-10467", client: "Mizrahi", trip: "EWR → TLV · 3 Oct – 21 Oct",
        stage: "Proposal sent", waitWho: "Client", waitWhat: "no answer 2 days",
        fare: 9240, agent: "RV", alert: true,
        deadlinePrefix: "Hold expires — today 4:15 PM, Hold", liveIn: 4 * HOUR + 12 * MIN,
      },
      {
        id: "R-10455", client: "Friedman", trip: "TLV → JFK · 28 Aug",
        stage: "Paid", waitWho: "Us", waitWhat: "issue when ready",
        fare: 11904, agent: "YN", deadline: "Ticketing limit — tomorrow 9:00 AM",
      },
      {
        id: "R-10402", client: "Weiss", trip: "JFK → TLV · 12 Sep – 30 Sep",
        stage: "Waiting for info", waitWho: "Client", waitWhat: "passport, Ariel (12)",
        fareText: "~$5,900", agent: "SR", alert: true,
        deadline: "Follow up — overdue 2 days",
      },
      {
        id: "R-10471", client: "Katz", trip: "LAX → TLV · 9 Sep – 24 Sep",
        stage: "Payment pending", waitWho: "Client", waitWhat: "invoice sent",
        fare: 6720, agent: "RV", deadline: "Hold expires — tomorrow 11:00 AM",
      },
      {
        id: "R-10486", client: "Gross", trip: "MIA → TLV · 2 Sep – 18 Sep",
        stage: "Ready to issue", waitWho: "Us", waitWhat: "supervisor approval, markup",
        fare: 8630, agent: "SR", alert: true,
        deadlinePrefix: "Ticketing limit — today 5:00 PM, TTL", liveIn: 3 * HOUR + 40 * MIN,
      },
      {
        id: "R-10493", client: "Rosenberg", trip: "JFK → TLV · 20 Aug – 4 Sep",
        stage: "Quoted", waitWho: "Client", waitWhat: "reviewing options",
        fare: 7410, agent: "MR", deadline: "Follow up — today 6:00 PM",
      },
      {
        id: "R-10478", client: "Lieberman", trip: "EWR → TLV · 11 Sep",
        stage: "Waiting for info", waitWho: "Client", waitWhat: "DOB, two travellers",
        fareText: "—", agent: "YN", deadline: "Follow up — today 8:00 PM",
      },
      {
        id: "R-10495", client: "Shapiro", trip: "ORD → TLV · 29 Dec – 12 Jan",
        stage: "New inquiry", waitWho: "Us", waitWhat: "not yet entered",
        fareText: "—", agent: "—", deadline: "Follow up — today 10:00 PM",
      },
    ],
  },
  {
    key: "tomorrow",
    label: "DUE TOMORROW — 6 REQUESTS",
    items: [
      {
        id: "R-10388", client: "Berkowitz", trip: "EWR → TLV · 1 Apr – 20 Apr",
        stage: "Quoted", waitWho: "Client", waitWhat: "no response 4 days",
        fare: 8155, agent: "MR", deadline: "Follow up — stale",
      },
      {
        id: "R-10440", client: "Schwartz", trip: "JFK → TLV · 18 Aug",
        stage: "Ticketed", waitWho: "Us", waitWhat: "check-in opens 6h",
        fare: 2340, agent: "YN", deadline: "Check-in opens — today 10:00 PM",
      },
      {
        id: "R-10490", client: "Adler", trip: "BOS → TLV · 22 Dec – 5 Jan",
        stage: "New inquiry", waitWho: "Us", waitWhat: "not yet entered",
        fareText: "—", agent: "—", deadline: "Follow up — today",
      },
      {
        id: "R-10489", client: "Stern", trip: "ORD → TLV · 7 Sep – 21 Sep",
        stage: "Quoted", waitWho: "Client", waitWhat: "quote sent today",
        fare: 4905, agent: "SR", deadline: "Follow up — tomorrow",
      },
      {
        id: "R-10476", client: "Gross", trip: "MIA → TLV · 2 Nov – 19 Nov",
        stage: "Proposal sent", waitWho: "Client", waitWhat: "choosing dates",
        fare: 5480, agent: "MR", deadline: "Follow up — tomorrow",
      },
      {
        id: "R-10461", client: "Halberstam", trip: "JFK → TLV · 25 Sep – 12 Oct",
        stage: "Payment pending", waitWho: "Client", waitWhat: "awaiting wire",
        fare: 10480, agent: "RV", deadline: "Hold expires — tomorrow 3:00 PM",
      },
    ],
  },
];

export const FILTERS: [string, number][] = [
  ["Needs Action Today", 9], ["Needs Intake", 2], ["Waiting on Client", 5],
  ["Holds Expiring", 3], ["Fare Watches", 4], ["Ready to Issue", 2],
  ["Unassigned", 1],
];

export type Column = { key: string; label: string; w: number | null; right?: boolean };

export const COLS: Column[] = [
  { key: "id", label: "Request #", w: 104 },
  { key: "client", label: "Client", w: 130 },
  { key: "trip", label: "Trip", w: 250 },
  { key: "stage", label: "Stage", w: 150 },
  { key: "waiting", label: "Waiting On", w: null },
  { key: "fare", label: "Fare", w: 110, right: true },
  { key: "deadline", label: "Deadline", w: 290, right: true },
  { key: "agent", label: "Agent", w: 64, right: true },
];

export const money = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
