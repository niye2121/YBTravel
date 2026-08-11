export type BookingStage =
  | "Payment pending"
  | "Paid"
  | "Ready to issue"
  | "Sent to ticketing"
  | "Ticket issued";

export type BookingRow = {
  id: string;
  client: string;
  trip: string;
  fare: number;
  paymentRef: string;
  stage: BookingStage;
  ticketingDeadline: string;
};

const money = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Bookings is the confirmed-stage subset of the same requests already in
// data/requestsData.ts — a booking only exists once a request has been
// accepted (P2-19), so this reuses those exact fares/clients rather than
// a parallel dataset. Mizrahi's second entry covers "Sent to ticketing,"
// the one stage none of the existing requests happen to have reached yet.
export const BOOKINGS: BookingRow[] = [
  { id: "B-5001", client: "Kaplan", trip: "JFK → TLV · 14 Aug – 2 Sep", fare: 4187.36,
    paymentRef: "WIRE-88213", stage: "Ready to issue", ticketingDeadline: "Today 3:20 PM" },
  { id: "B-5002", client: "Gross", trip: "MIA → TLV · 2 Sep – 18 Sep", fare: 8630,
    paymentRef: "CC-4471-2209", stage: "Ready to issue", ticketingDeadline: "Today 5:00 PM" },
  { id: "B-5003", client: "Friedman", trip: "TLV → JFK · 28 Aug", fare: 11904,
    paymentRef: "WIRE-88190", stage: "Paid", ticketingDeadline: "Tomorrow 9:00 AM" },
  { id: "B-5004", client: "Katz", trip: "LAX → TLV · 9 Sep – 24 Sep", fare: 6720,
    paymentRef: "—, invoice sent", stage: "Payment pending", ticketingDeadline: "Tomorrow 11:00 AM" },
  { id: "B-5005", client: "Halberstam", trip: "JFK → TLV · 25 Sep – 12 Oct", fare: 10480,
    paymentRef: "—, awaiting wire", stage: "Payment pending", ticketingDeadline: "Tomorrow 3:00 PM" },
  { id: "B-5006", client: "Mizrahi", trip: "EWR → TLV · 3 Oct – 21 Oct", fare: 5200,
    paymentRef: "CC-4471-2311", stage: "Sent to ticketing", ticketingDeadline: "Today 4:15 PM" },
  { id: "B-5007", client: "Schwartz", trip: "JFK → TLV · 18 Aug", fare: 2340,
    paymentRef: "CC-4470-1187", stage: "Ticket issued", ticketingDeadline: "Issued" },
];

export const BOOKING_FILTERS: [string, number][] = [
  ["All Bookings", BOOKINGS.length],
  ["Payment Pending", BOOKINGS.filter((b) => b.stage === "Payment pending").length],
  ["Paid", BOOKINGS.filter((b) => b.stage === "Paid").length],
  ["Ready to Issue", BOOKINGS.filter((b) => b.stage === "Ready to issue").length],
  ["Sent to Ticketing", BOOKINGS.filter((b) => b.stage === "Sent to ticketing").length],
  ["Ticket Issued", BOOKINGS.filter((b) => b.stage === "Ticket issued").length],
];

export { money };
