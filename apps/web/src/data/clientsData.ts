export type OnboardingStage =
  | "New inquiry"
  | "Welcome sent"
  | "Waiting for info"
  | "Information received"
  | "Review complete"
  | "Fully onboarded";

export type FeeGroup = "Standard" | "Belev Echad" | "Scheiman";

export type ClientRow = {
  id: string;
  name: string;
  rep: string;
  feeGroup: FeeGroup;
  stage: OnboardingStage;
  missing: string;
  lastActivity: string;
};

// Same clients already appearing in data/requestsData.ts, viewed from the
// account side rather than the request side — a client with an active
// quote/booking must already be "Fully onboarded" (P2 depends on the P1
// foundation), so stages here are derived from those requests, not invented
// separately. A few (Feldman, Perlman, Klein) round out the earlier
// onboarding stages, which none of the existing requests happen to cover.
export const CLIENTS: ClientRow[] = [
  { id: "C-2001", name: "Kaplan", rep: "S. Rubin", feeGroup: "Standard",
    stage: "Fully onboarded", missing: "—", lastActivity: "Today 3:20 PM" },
  { id: "C-2002", name: "Mizrahi", rep: "R. Vogel", feeGroup: "Standard",
    stage: "Fully onboarded", missing: "—", lastActivity: "Today 1:10 PM" },
  { id: "C-2003", name: "Weiss", rep: "S. Rubin", feeGroup: "Standard",
    stage: "Waiting for info", missing: "Passport — Ariel (12)", lastActivity: "2 days ago" },
  { id: "C-2004", name: "Katz", rep: "R. Vogel", feeGroup: "Belev Echad",
    stage: "Fully onboarded", missing: "—", lastActivity: "Yesterday" },
  { id: "C-2005", name: "Gross", rep: "S. Rubin", feeGroup: "Belev Echad",
    stage: "Fully onboarded", missing: "—", lastActivity: "Today 11:40 AM" },
  { id: "C-2006", name: "Rosenberg", rep: "M. Roth", feeGroup: "Standard",
    stage: "Fully onboarded", missing: "—", lastActivity: "Today 9:05 AM" },
  { id: "C-2007", name: "Friedman", rep: "Y. Neuman", feeGroup: "Standard",
    stage: "Fully onboarded", missing: "—", lastActivity: "Yesterday" },
  { id: "C-2008", name: "Lieberman", rep: "Y. Neuman", feeGroup: "Standard",
    stage: "Waiting for info", missing: "DOB — two travellers", lastActivity: "Today 8:15 AM" },
  { id: "C-2009", name: "Shapiro", rep: "—", feeGroup: "Standard",
    stage: "New inquiry", missing: "Everything — not yet reviewed", lastActivity: "Today 7:50 AM" },
  { id: "C-2010", name: "Berkowitz", rep: "M. Roth", feeGroup: "Standard",
    stage: "Fully onboarded", missing: "—", lastActivity: "4 days ago" },
  { id: "C-2011", name: "Schwartz", rep: "Y. Neuman", feeGroup: "Scheiman",
    stage: "Fully onboarded", missing: "—", lastActivity: "3 days ago" },
  { id: "C-2012", name: "Adler", rep: "—", feeGroup: "Standard",
    stage: "New inquiry", missing: "Everything — not yet reviewed", lastActivity: "Today 6:30 AM" },
  { id: "C-2013", name: "Stern", rep: "S. Rubin", feeGroup: "Standard",
    stage: "Fully onboarded", missing: "—", lastActivity: "Today" },
  { id: "C-2014", name: "Halberstam", rep: "R. Vogel", feeGroup: "Standard",
    stage: "Fully onboarded", missing: "—", lastActivity: "2 days ago" },
  { id: "C-2015", name: "Feldman", rep: "M. Roth", feeGroup: "Standard",
    stage: "Welcome sent", missing: "Everything — welcome message sent", lastActivity: "Yesterday" },
  { id: "C-2016", name: "Perlman", rep: "S. Rubin", feeGroup: "Standard",
    stage: "Information received", missing: "Cabin class preference", lastActivity: "Today 10:00 AM" },
  { id: "C-2017", name: "Klein", rep: "R. Vogel", feeGroup: "Standard",
    stage: "Review complete", missing: "—, pending final sign-off", lastActivity: "Today 12:15 PM" },
];

export const CLIENT_FILTERS: [string, number][] = [
  ["All Clients", CLIENTS.length],
  ["New Inquiry", CLIENTS.filter((c) => c.stage === "New inquiry").length],
  ["Waiting for Info", CLIENTS.filter((c) => c.stage === "Waiting for info").length],
  ["Fully Onboarded", CLIENTS.filter((c) => c.stage === "Fully onboarded").length],
  ["My Clients", CLIENTS.filter((c) => c.rep === "M. Roth").length],
];
