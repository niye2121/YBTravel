import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppHeader } from "../components/AppShell/AppHeader";
import { FilterStrip } from "../components/AppShell/FilterStrip";
import { SecondaryButton } from "../components/AppShell/buttons";
import { ImplementationStatusIcon } from "../components/ImplementationStatusIcon";
import { BOOKINGS, BOOKING_FILTERS, money, type BookingRow } from "../data/bookingsData";
import { NAV_TABS } from "../lib/navTabs";

export const Route = createFileRoute("/bookings")({
  component: BookingsPage,
});

function matchesFilter(booking: BookingRow, filter: string): boolean {
  switch (filter) {
    case "Payment Pending":
      return booking.stage === "Payment pending";
    case "Paid":
      return booking.stage === "Paid";
    case "Ready to Issue":
      return booking.stage === "Ready to issue";
    case "Sent to Ticketing":
      return booking.stage === "Sent to ticketing";
    case "Ticket Issued":
      return booking.stage === "Ticket issued";
    default:
      return true;
  }
}

function BookingsPage() {
  const [filter, setFilter] = useState("All Bookings");
  const [query, setQuery] = useState("");
  const [hoverRow, setHoverRow] = useState<string | null>(null);

  const bookings = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BOOKINGS.filter((b) => matchesFilter(b, filter)).filter((b) =>
      q ? [b.id, b.client, b.trip].join(" ").toLowerCase().includes(q) : true,
    );
  }, [filter, query]);

  return (
    <div className="min-w-[1280px] bg-white text-yb-ink">
      <AppHeader tabs={NAV_TABS} query={query} onQueryChange={setQuery} />

      <FilterStrip filters={BOOKING_FILTERS} active={filter} onChange={setFilter} />

      <div className="flex items-center gap-[14px] px-[22px] pt-[16px] pb-[14px]">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-yb-tile bg-yb-green">
          <div className="h-[13px] w-[13px] rounded-[1px] border-2 border-yb-gold" />
        </div>
        <div>
          <div className="text-[10.5px] font-bold tracking-[1.4px] text-yb-muted4">BOOKINGS</div>
          <div className="flex items-baseline gap-[10px]">
            <h1 className="mt-[1px] text-[26px] font-black tracking-[-0.2px]">{filter}</h1>
            <span className="text-[13px] text-yb-muted3">{BOOKINGS.length} total</span>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-[10px]">
          <SecondaryButton className="group/status-parent flex items-center gap-[7px]" aria-disabled="true">Export ▾ <ImplementationStatusIcon label="Coming in Phase 2" description="Booking export will be added with the live booking workflow." withinInteractiveControl /></SecondaryButton>
        </div>
      </div>

      <div className="mx-[22px] mt-[-4px] mb-4 flex items-center gap-[7px] px-[22px] text-[12.5px] text-yb-muted3">
        <ImplementationStatusIcon label="Coming in Phase 2" description="This page uses demonstration data. Booking and payment actions are not implemented yet." />
        Preview only — booking and payment actions are not available from this screen yet.
      </div>

      <div className="mx-[22px] mb-[26px] rounded-yb border border-yb-line bg-white">
        <div className="flex items-center border-b border-yb-line bg-yb-panel-head px-[14px] py-2">
          <div className="text-[11.5px] font-bold tracking-[1.1px] text-yb-panel-head-text">
            BOOKINGS — {filter.toUpperCase()}
          </div>
          <div className="flex-1" />
          <div className="text-[11.5px] text-yb-muted3">{bookings.length} items</div>
        </div>

        <table className="w-full table-fixed border-collapse text-[14px]">
          <thead>
            <tr className="bg-yb-table-head">
              <th className="w-[90px] border-b border-yb-line py-[7px] pr-2 pl-[14px] text-left font-bold text-yb-muted">
                Booking #
              </th>
              <th className="w-[120px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">
                Client
              </th>
              <th className="w-[220px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">
                Trip
              </th>
              <th className="w-[110px] border-b border-yb-line px-2 py-[7px] text-right font-bold text-yb-muted">
                Fare
              </th>
              <th className="w-[150px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">
                Payment Reference
              </th>
              <th className="w-[140px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">
                Stage
              </th>
              <th className="w-[130px] border-b border-yb-line py-[7px] pr-[14px] pl-2 text-right font-bold text-yb-muted">
                Ticketing Deadline
              </th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => {
              const hovered = hoverRow === b.id;
              return (
                <tr
                  key={b.id}
                  onMouseEnter={() => setHoverRow(b.id)}
                  onMouseLeave={() => setHoverRow(null)}
                  className={`cursor-pointer ${hovered ? "bg-yb-row-hover" : "bg-white"}`}
                >
                  <td className="border-b border-yb-line-row py-[11px] pr-2 pl-[14px]">
                    <a href="#" onClick={(e) => e.preventDefault()} className="text-yb-green underline">
                      {b.id}
                    </a>
                  </td>
                  <td className="border-b border-yb-line-row px-2 py-[11px] font-bold">{b.client}</td>
                  <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">{b.trip}</td>
                  <td className="border-b border-yb-line-row px-2 py-[11px] text-right tabular-nums text-yb-ink">
                    {money(b.fare)}
                  </td>
                  <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">{b.paymentRef}</td>
                  <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">{b.stage}</td>
                  <td className="border-b border-yb-line-row py-[11px] pr-[14px] pl-2 text-right text-yb-muted">
                    {b.ticketingDeadline}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {bookings.length === 0 && (
          <div className="px-[14px] py-[28px] text-center text-[14px] text-yb-muted3">
            No bookings match &ldquo;{query}&rdquo;.
          </div>
        )}
      </div>
    </div>
  );
}
