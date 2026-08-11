import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppHeader } from "../components/AppShell/AppHeader";
import { SecondaryButton } from "../components/AppShell/buttons";
import { TRAVELLERS, type PassportStatus } from "../data/travellersData";
import { NAV_TABS } from "../lib/navTabs";

export const Route = createFileRoute("/travellers")({
  component: TravellersPage,
});

const statusColour = (s: PassportStatus) =>
  s === "Missing" ? "text-yb-red" : s === "Expiring soon" ? "text-yb-amber" : "text-yb-ink2";

function TravellersPage() {
  const [query, setQuery] = useState("");
  const [missingOnly, setMissingOnly] = useState(false);
  const [hoverRow, setHoverRow] = useState<string | null>(null);

  const travellers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TRAVELLERS.filter((t) => (missingOnly ? t.passportStatus === "Missing" : true)).filter(
      (t) => (q ? [t.name, t.client].join(" ").toLowerCase().includes(q) : true),
    );
  }, [query, missingOnly]);

  const missingCount = TRAVELLERS.filter((t) => t.passportStatus === "Missing").length;

  return (
    <div className="min-w-[1280px] bg-white text-yb-ink">
      <AppHeader tabs={NAV_TABS} query={query} onQueryChange={setQuery} />

      {/* Page header — no filter strip: this is a flat reference list
          (P1-04), not a workflow queue, so a search + single toggle
          replaces the saved-views pattern used on Requests/Clients. */}
      <div className="flex items-center gap-[14px] border-b border-yb-line-head px-[22px] pt-[16px] pb-[14px]">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-yb-tile bg-yb-green">
          <div className="h-[13px] w-[13px] rounded-[1px] border-2 border-yb-gold" />
        </div>
        <div>
          <div className="text-[10.5px] font-bold tracking-[1.4px] text-yb-muted4">TRAVELLERS</div>
          <div className="flex items-baseline gap-[10px]">
            <h1 className="mt-[1px] text-[26px] font-black tracking-[-0.2px]">All Travellers</h1>
            <span className="text-[13px] text-yb-muted3">
              {TRAVELLERS.length} total · {missingCount} missing passport info
            </span>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-[10px]">
          <button
            type="button"
            onClick={() => setMissingOnly((v) => !v)}
            className={`h-[34px] rounded-yb border px-[16px] text-[14px] ${
              missingOnly
                ? "border-yb-red bg-[#fdf1f0] font-bold text-yb-red"
                : "border-yb-line-btn bg-white text-yb-ink2"
            }`}
          >
            Missing Passport Info
          </button>
          <SecondaryButton>Export ▾</SecondaryButton>
        </div>
      </div>

      {/* Panel */}
      <div className="mx-[22px] mt-4 mb-[26px] rounded-yb border border-yb-line bg-white">
        <div className="flex items-center border-b border-yb-line bg-yb-panel-head px-[14px] py-2">
          <div className="text-[11.5px] font-bold tracking-[1.1px] text-yb-panel-head-text">
            TRAVELLERS{missingOnly ? " — MISSING PASSPORT INFO" : ""}
          </div>
          <div className="flex-1" />
          <div className="text-[11.5px] text-yb-muted3">{travellers.length} items</div>
        </div>

        <table className="w-full table-fixed border-collapse text-[14px]">
          <thead>
            <tr className="bg-yb-table-head">
              <th className="w-[170px] border-b border-yb-line py-[7px] pr-2 pl-[14px] text-left font-bold text-yb-muted">
                Name
              </th>
              <th className="w-[130px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">
                Date of Birth
              </th>
              <th className="w-[150px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">
                Passport Status
              </th>
              <th className="border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">
                Client
              </th>
              <th className="w-[140px] border-b border-yb-line py-[7px] pr-[14px] pl-2 text-right font-bold text-yb-muted">
                Upcoming Trips
              </th>
            </tr>
          </thead>
          <tbody>
            {travellers.map((t) => {
              const hovered = hoverRow === t.id;
              return (
                <tr
                  key={t.id}
                  onMouseEnter={() => setHoverRow(t.id)}
                  onMouseLeave={() => setHoverRow(null)}
                  className={`cursor-pointer ${hovered ? "bg-yb-row-hover" : "bg-white"}`}
                >
                  <td className="border-b border-yb-line-row py-[11px] pr-2 pl-[14px] font-bold">{t.name}</td>
                  <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">{t.dob}</td>
                  <td
                    className={`border-b border-yb-line-row px-2 py-[11px] ${statusColour(t.passportStatus)} ${
                      t.passportStatus !== "On file" ? "font-bold" : ""
                    }`}
                  >
                    {t.passportStatus}
                  </td>
                  <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">
                    <a href="#" onClick={(e) => e.preventDefault()} className="text-yb-green underline">
                      {t.client}
                    </a>
                  </td>
                  <td className="border-b border-yb-line-row py-[11px] pr-[14px] pl-2 text-right tabular-nums text-yb-muted3">
                    {t.upcomingTrips}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {travellers.length === 0 && (
          <div className="px-[14px] py-[28px] text-center text-[14px] text-yb-muted3">
            No travellers match &ldquo;{query}&rdquo;.
          </div>
        )}
      </div>
    </div>
  );
}
