import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppHeader } from "../components/AppShell/AppHeader";
import { SupervisorQueueTabs } from "../components/SupervisorQueueTabs";
import { supervisorApi } from "../lib/api";
import { NAV_TABS } from "../lib/navTabs";
import { getStoredUser, hasPermission } from "../lib/session";
import { useAuth } from "../lib/AuthContext";

export const Route = createFileRoute("/reports/agent-workload")({
  beforeLoad: () => {
    if (!hasPermission(getStoredUser(), "workloads.manage")) throw redirect({ to: "/" });
  },
  component: AgentWorkloadReportPage,
});

/** Renders the live Phase 1 workload report as rows, with no speculative chart. */
function AgentWorkloadReportPage() {
  const { can } = useAuth();
  const workloadQuery = useQuery({ queryKey: ["supervisor", "workload", true], queryFn: () => supervisorApi.workload(true) });
  const reviewsQuery = useQuery({ queryKey: ["supervisor", "reviews", "unreviewed"], queryFn: () => supervisorApi.reviews("unreviewed"), enabled: can("exceptions.approve") });
  return <div className="min-h-screen min-w-[1300px] bg-yb-canvas text-yb-ink"><AppHeader tabs={NAV_TABS} compact /><SupervisorQueueTabs unreviewedCount={reviewsQuery.data?.counts.unreviewed} /><main className="px-[16px] pt-[14px] pb-[36px]"><header className="mb-[12px] flex items-end"><div><div className="text-[10px] uppercase tracking-[1.4px] text-yb-muted3">Live operational report</div><h1 className="yb-page-title">Agent workload report</h1></div><div className="flex-1" /><button type="button" onClick={() => window.print()} className="h-[34px] border border-yb-line-btn bg-white px-[16px] text-[12px] underline">Print</button></header><section className="border-2 border-yb-line bg-white"><div className="flex h-[32px] items-center border-b border-yb-line bg-yb-panel-head px-[14px]"><div className="text-[10.5px] font-bold tracking-[1px] text-yb-panel-head-text">AGENT WORKLOAD</div><div className="flex-1" /><div className="text-[11px] text-yb-muted3">Current Phase 1 requests and obligations</div></div><table className="w-full table-fixed border-collapse text-[12px]"><thead><tr className="h-[30px] bg-yb-table-head text-yb-muted"><th className="px-[12px] text-left">Agent</th><th className="text-right">Open requests</th><th className="text-right">Open bookings</th><th className="text-right">Obligations today</th><th className="text-right">Obligations overdue</th><th className="px-[12px] text-right">Cases</th></tr></thead><tbody>{(workloadQuery.data ?? []).map((row) => <tr key={row.userId} className="h-[44px] border-t border-yb-line-row"><td className="px-[12px] font-bold">{row.agentName}</td><td className="text-right tabular-nums">{row.openRequests}</td><td className="text-right tabular-nums">{row.openBookings}</td><td className="text-right tabular-nums">{row.dueToday}</td><td className="text-right font-bold tabular-nums text-yb-red">{row.overdue + row.escalated}</td><td className="px-[12px] text-right tabular-nums">{row.openCases}</td></tr>)}</tbody></table>{workloadQuery.isLoading && <div className="px-[14px] py-[28px] text-center text-yb-muted3">Loading report…</div>}</section></main></div>;
}
