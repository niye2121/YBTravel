import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppHeader } from "../components/AppShell/AppHeader";
import { FilterStrip } from "../components/AppShell/FilterStrip";
import { SecondaryButton } from "../components/AppShell/buttons";
import { ImplementationStatusIcon } from "../components/ImplementationStatusIcon";
import { TICKETS, TICKET_FILTERS, money, type TicketRow, type TicketStatus } from "../data/ticketsData";
import { NAV_TABS } from "../lib/navTabs";

export const Route = createFileRoute("/tickets")({
  component: TicketsPage,
});

const statusColour = (s: TicketStatus) =>
  s === "Active" ? "text-yb-green" : s === "Pending Reissue" ? "text-yb-amber" : "text-yb-red";

function matchesFilter(ticket: TicketRow, filter: string): boolean {
  switch (filter) {
    case "Issued":
      return ticket.status === "Active";
    case "Pending Reissue":
      return ticket.status === "Pending Reissue";
    case "Void/Refund in Progress":
      return ticket.status === "Refund in Progress";
    default:
      return true;
  }
}

function TicketsPage() {
  const [filter, setFilter] = useState("All Tickets");
  const [query, setQuery] = useState("");
  const [hoverRow, setHoverRow] = useState<string | null>(null);

  const tickets = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TICKETS.filter((t) => matchesFilter(t, filter)).filter((t) =>
      q ? [t.id, t.client, t.trip].join(" ").toLowerCase().includes(q) : true,
    );
  }, [filter, query]);

  return (
    <div className="min-w-[1280px] bg-white text-yb-ink">
      <AppHeader tabs={NAV_TABS} query={query} onQueryChange={setQuery} />

      <FilterStrip filters={TICKET_FILTERS} active={filter} onChange={setFilter} />

      <div className="flex items-center gap-[14px] px-[22px] pt-[16px] pb-[14px]">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-yb-tile bg-yb-green">
          <div className="h-[13px] w-[13px] rounded-[1px] border-2 border-yb-gold" />
        </div>
        <div>
          <div className="text-[10.5px] font-bold tracking-[1.4px] text-yb-muted4">TICKETS</div>
          <div className="flex items-baseline gap-[10px]">
            <h1 className="mt-[1px] text-[26px] font-black tracking-[-0.2px]">{filter}</h1>
            <span className="text-[13px] text-yb-muted3">{TICKETS.length} total</span>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-[10px]">
          <SecondaryButton className="group/status-parent flex items-center gap-[7px]" aria-disabled="true">Export ▾ <ImplementationStatusIcon label="Coming in Phase 3" description="Ticket export will be added with the live Sabre ticketing workflow." withinInteractiveControl /></SecondaryButton>
        </div>
      </div>

      <div className="mx-[22px] mt-[-4px] mb-4 flex items-center gap-[7px] px-[22px] text-[12.5px] text-yb-muted3">
        <ImplementationStatusIcon label="Coming in Phase 3" description="This page uses demonstration data and requires the Sabre connection." />
        Preview only — Sabre isn't connected yet (Phase 3 is gated on commercial access being
        confirmed), so issuance, reissue and void/refund aren't available from this screen.
      </div>

      <div className="mx-[22px] mb-[26px] rounded-yb border border-yb-line bg-white">
        <div className="flex items-center border-b border-yb-line bg-yb-panel-head px-[14px] py-2">
          <div className="text-[11.5px] font-bold tracking-[1.1px] text-yb-panel-head-text">
            TICKETS — {filter.toUpperCase()}
          </div>
          <div className="flex-1" />
          <div className="text-[11.5px] text-yb-muted3">{tickets.length} items</div>
        </div>

        <table className="w-full table-fixed border-collapse text-[14px]">
          <thead>
            <tr className="bg-yb-table-head">
              <th className="w-[110px] border-b border-yb-line py-[7px] pr-2 pl-[14px] text-left font-bold text-yb-muted">
                Ticket #
              </th>
              <th className="w-[120px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">
                Client
              </th>
              <th className="w-[230px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">
                Trip
              </th>
              <th className="w-[120px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">
                Issue Date
              </th>
              <th className="w-[110px] border-b border-yb-line px-2 py-[7px] text-right font-bold text-yb-muted">
                Fare
              </th>
              <th className="w-[150px] border-b border-yb-line py-[7px] pr-[14px] pl-2 text-left font-bold text-yb-muted">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => {
              const hovered = hoverRow === t.id;
              return (
                <tr
                  key={t.id}
                  onMouseEnter={() => setHoverRow(t.id)}
                  onMouseLeave={() => setHoverRow(null)}
                  className={hovered ? "bg-yb-row-hover" : "bg-white"}
                >
                  <td className="border-b border-yb-line-row py-[11px] pr-2 pl-[14px] text-yb-ink2">{t.id}</td>
                  <td className="border-b border-yb-line-row px-2 py-[11px] font-bold">{t.client}</td>
                  <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">{t.trip}</td>
                  <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">{t.issueDate}</td>
                  <td className="border-b border-yb-line-row px-2 py-[11px] text-right tabular-nums text-yb-ink">
                    {money(t.fare)}
                  </td>
                  <td
                    className={`border-b border-yb-line-row py-[11px] pr-[14px] pl-2 font-bold ${statusColour(t.status)}`}
                  >
                    {t.status}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {tickets.length === 0 && (
          <div className="px-[14px] py-[28px] text-center text-[14px] text-yb-muted3">
            No tickets match &ldquo;{query}&rdquo;.
          </div>
        )}
      </div>
    </div>
  );
}
