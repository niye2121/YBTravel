import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppHeader } from "../components/AppShell/AppHeader";
import { FilterStrip } from "../components/AppShell/FilterStrip";
import { PrimaryButton, SecondaryButton } from "../components/AppShell/buttons";
import { CLIENTS, CLIENT_FILTERS, type ClientRow } from "../data/clientsData";
import { NAV_TABS } from "../lib/navTabs";

export const Route = createFileRoute("/clients")({
  component: ClientsPage,
});

const selectClass =
  "h-[28px] rounded-yb border border-yb-line-btn bg-white px-[6px] text-[13.5px] font-bold text-yb-ink";

function matchesFilter(client: ClientRow, filter: string): boolean {
  switch (filter) {
    case "New Inquiry":
      return client.stage === "New inquiry";
    case "Waiting for Info":
      return client.stage === "Waiting for info";
    case "Fully Onboarded":
      return client.stage === "Fully onboarded";
    case "My Clients":
      return client.rep === "M. Roth";
    default:
      return true;
  }
}

function ClientsPage() {
  const [filter, setFilter] = useState("All Clients");
  const [query, setQuery] = useState("");
  const [hoverRow, setHoverRow] = useState<string | null>(null);

  const clients = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CLIENTS.filter((c) => matchesFilter(c, filter)).filter((c) =>
      q ? [c.id, c.name, c.rep, c.stage].join(" ").toLowerCase().includes(q) : true,
    );
  }, [filter, query]);

  return (
    <div className="min-w-[1280px] bg-white text-yb-ink">
      <AppHeader tabs={NAV_TABS} query={query} onQueryChange={setQuery} />

      <FilterStrip filters={CLIENT_FILTERS} active={filter} onChange={setFilter} />

      {/* Page header */}
      <div className="flex items-center gap-[14px] px-[22px] pt-[16px] pb-[14px]">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-yb-tile bg-yb-green">
          <div className="h-[13px] w-[13px] rounded-[1px] border-2 border-yb-gold" />
        </div>
        <div>
          <div className="text-[10.5px] font-bold tracking-[1.4px] text-yb-muted4">CLIENTS</div>
          <div className="flex items-baseline gap-[10px]">
            <h1 className="mt-[1px] text-[26px] font-black tracking-[-0.2px]">{filter}</h1>
            <span className="text-[13px] text-yb-muted3">{CLIENTS.length} total</span>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-[10px]">
          <PrimaryButton>+ New Client</PrimaryButton>
          <SecondaryButton>Export ▾</SecondaryButton>
        </div>
      </div>

      {/* Panel */}
      <div className="mx-[22px] mb-[26px] rounded-yb border border-yb-line bg-white">
        <div className="flex items-center border-b border-yb-line bg-yb-panel-head px-[14px] py-2">
          <div className="text-[11.5px] font-bold tracking-[1.1px] text-yb-panel-head-text">
            CLIENTS — {filter.toUpperCase()}
          </div>
          <div className="flex-1" />
          <div className="text-[11.5px] text-yb-muted3">{clients.length} items</div>
        </div>

        <div className="flex items-center gap-[10px] border-b border-yb-line-soft bg-yb-toolbar px-[14px] py-[9px]">
          <span className="text-[13px] text-yb-muted">View:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={selectClass}
          >
            {CLIENT_FILTERS.map(([l]) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <a href="#" onClick={(e) => e.preventDefault()} className="text-[13px] text-yb-green underline">
            Edit
          </a>
          <a href="#" onClick={(e) => e.preventDefault()} className="text-[13px] text-yb-green underline">
            Create New View
          </a>
        </div>

        <table className="w-full table-fixed border-collapse text-[14px]">
          <thead>
            <tr className="bg-yb-table-head">
              <th className="w-[150px] border-b border-yb-line py-[7px] pr-2 pl-[14px] text-left font-bold text-yb-muted">
                Client
              </th>
              <th className="w-[110px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">
                Rep
              </th>
              <th className="w-[120px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">
                Fee Group
              </th>
              <th className="w-[160px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">
                Onboarding Stage
              </th>
              <th className="border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">
                Missing
              </th>
              <th className="w-[130px] border-b border-yb-line py-[7px] pr-[14px] pl-2 text-right font-bold text-yb-muted">
                Last Activity
              </th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => {
              const hovered = hoverRow === c.id;
              return (
                <tr
                  key={c.id}
                  onMouseEnter={() => setHoverRow(c.id)}
                  onMouseLeave={() => setHoverRow(null)}
                  className={`cursor-pointer ${hovered ? "bg-yb-row-hover" : "bg-white"}`}
                >
                  <td className="border-b border-yb-line-row py-[11px] pr-2 pl-[14px] font-bold">
                    <a href="#" onClick={(e) => e.preventDefault()} className="text-yb-green underline">
                      {c.name}
                    </a>
                  </td>
                  <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">{c.rep}</td>
                  <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">{c.feeGroup}</td>
                  <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">{c.stage}</td>
                  <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-muted2">{c.missing}</td>
                  <td className="border-b border-yb-line-row py-[11px] pr-[14px] pl-2 text-right text-yb-muted3">
                    {c.lastActivity}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {clients.length === 0 && (
          <div className="px-[14px] py-[28px] text-center text-[14px] text-yb-muted3">
            No clients match &ldquo;{query}&rdquo;.
          </div>
        )}
      </div>
    </div>
  );
}
