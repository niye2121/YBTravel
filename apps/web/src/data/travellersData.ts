export type PassportStatus = "On file" | "Missing" | "Expiring soon";

export type TravellerRow = {
  id: string;
  name: string;
  dob: string;
  passportStatus: PassportStatus;
  client: string;
  upcomingTrips: number;
};

// Travellers reuse for future trips per P1-04 — each client's own record
// plus any family/dependants. Ariel Weiss and the two Liebermans are the
// same missing-info flags already referenced in data/requestsData.ts
// ("passport, Ariel (12)", "DOB, two travellers"), not invented separately.
export const TRAVELLERS: TravellerRow[] = [
  { id: "T-3001", name: "Kaplan", dob: "12 Apr 1985", passportStatus: "On file", client: "Kaplan", upcomingTrips: 1 },
  { id: "T-3002", name: "Mizrahi", dob: "3 Nov 1979", passportStatus: "On file", client: "Mizrahi", upcomingTrips: 1 },
  { id: "T-3003", name: "Weiss", dob: "20 Jun 1980", passportStatus: "On file", client: "Weiss", upcomingTrips: 1 },
  { id: "T-3004", name: "Ariel Weiss", dob: "15 Feb 2014", passportStatus: "Missing", client: "Weiss", upcomingTrips: 1 },
  { id: "T-3005", name: "Katz", dob: "8 Sep 1990", passportStatus: "On file", client: "Katz", upcomingTrips: 1 },
  { id: "T-3006", name: "Gross", dob: "30 Jan 1975", passportStatus: "On file", client: "Gross", upcomingTrips: 2 },
  { id: "T-3007", name: "Rosenberg", dob: "22 Jul 1988", passportStatus: "On file", client: "Rosenberg", upcomingTrips: 1 },
  { id: "T-3008", name: "Friedman", dob: "11 Mar 1970", passportStatus: "On file", client: "Friedman", upcomingTrips: 1 },
  { id: "T-3009", name: "Lieberman", dob: "Missing", passportStatus: "Missing", client: "Lieberman", upcomingTrips: 1 },
  { id: "T-3010", name: "Noa Lieberman", dob: "Missing", passportStatus: "Missing", client: "Lieberman", upcomingTrips: 1 },
  { id: "T-3011", name: "Shapiro", dob: "Missing", passportStatus: "Missing", client: "Shapiro", upcomingTrips: 0 },
  { id: "T-3012", name: "Berkowitz", dob: "18 May 1982", passportStatus: "On file", client: "Berkowitz", upcomingTrips: 1 },
  { id: "T-3013", name: "Schwartz", dob: "2 Dec 1977", passportStatus: "On file", client: "Schwartz", upcomingTrips: 1 },
  { id: "T-3014", name: "Dana Schwartz", dob: "14 Aug 1979", passportStatus: "On file", client: "Schwartz", upcomingTrips: 1 },
  { id: "T-3015", name: "Adler", dob: "Missing", passportStatus: "Missing", client: "Adler", upcomingTrips: 0 },
  { id: "T-3016", name: "Stern", dob: "25 Oct 1991", passportStatus: "Expiring soon", client: "Stern", upcomingTrips: 1 },
  { id: "T-3017", name: "Halberstam", dob: "4 Apr 1984", passportStatus: "On file", client: "Halberstam", upcomingTrips: 1 },
];
