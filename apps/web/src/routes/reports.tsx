import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "../components/AppShell/AppHeader";
import { Panel } from "../components/AppShell/Panel";
import { AGENT_WORKLOAD, CONVERSION, REVENUE, TICKETING_RISK } from "../data/reportsData";
import { NAV_TABS } from "../lib/navTabs";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
});

const maxOpen = Math.max(...AGENT_WORKLOAD.map((a) => a.open));

function ReportsPage() {
  return (
    <div className="min-w-[1280px] bg-[#f7f7f2] text-yb-ink">
      <AppHeader tabs={NAV_TABS} />

      {/* No filter strip and no table here on purpose — Reports is
          aggregate metrics (P8-08..13, Phase 8, "Future"), not a workflow
          queue, and this is deliberately the lightest of the five new
          pages rather than over-building speculative analytics. */}
      <div className="flex items-center gap-[14px] border-b border-yb-line-head bg-white px-[22px] pt-[16px] pb-[14px]">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-yb-tile bg-yb-green">
          <div className="h-[13px] w-[13px] rounded-[1px] border-2 border-yb-gold" />
        </div>
        <div>
          <div className="text-[10.5px] font-bold tracking-[1.4px] text-yb-muted4">REPORTS</div>
          <div className="flex items-baseline gap-[10px]">
            <h1 className="mt-[1px] text-[26px] font-black tracking-[-0.2px]">Management Visibility</h1>
            <span className="text-[13px] text-yb-muted3">summary figures, not live analytics yet</span>
          </div>
        </div>
      </div>

      <div className="px-[22px] pt-4 pb-[26px]">
        <div className="grid grid-cols-3 gap-4">
          <Panel title="INQUIRY → BOOKING CONVERSION" pad>
            <div className="text-[36px] font-black leading-none text-yb-green">{CONVERSION.rate}</div>
            <div className="mt-2 text-[13px] text-yb-muted3">{CONVERSION.detail}</div>
          </Panel>

          <Panel title="BOOKING-FEE REVENUE" pad>
            <div className="text-[36px] font-black leading-none text-yb-green">{REVENUE.total}</div>
            <div className="mt-2 text-[13px] text-yb-muted3">{REVENUE.detail}</div>
          </Panel>

          <Panel title="TICKETING DEADLINE RISK" pad>
            <div className="text-[36px] font-black leading-none text-yb-red">{TICKETING_RISK.count}</div>
            <div className="mt-2 text-[13px] text-yb-muted3">{TICKETING_RISK.detail}</div>
          </Panel>
        </div>

        <div className="mt-4">
          <Panel title="AGENT WORKLOAD" right="open requests by agent">
            {AGENT_WORKLOAD.map((a, i) => (
              <div
                key={a.agent}
                className={`flex items-center gap-[10px] px-[14px] py-2 text-[13.5px] ${
                  i < AGENT_WORKLOAD.length - 1 ? "border-b border-yb-line-row" : ""
                }`}
              >
                <span className="w-[130px] text-yb-ink2">{a.agent}</span>
                <span className="h-[10px] flex-1 rounded-[1px] bg-yb-line-row">
                  <span
                    className="block h-[10px] rounded-[1px] bg-yb-green"
                    style={{ width: `${(a.open / maxOpen) * 100}%` }}
                  />
                </span>
                <span className="w-5 text-right font-bold tabular-nums">{a.open}</span>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </div>
  );
}
