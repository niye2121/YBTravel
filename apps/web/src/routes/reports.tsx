import { Link, Outlet, createFileRoute, redirect, useRouterState } from "@tanstack/react-router";
import { AppHeader } from "../components/AppShell/AppHeader";
import { useAuth } from "../lib/AuthContext";
import { NAV_TABS } from "../lib/navTabs";
import { getStoredUser, hasPermission } from "../lib/session";

export const Route = createFileRoute("/reports")({
  beforeLoad: () => {
    if (!hasPermission(getStoredUser(), "workloads.manage")) throw redirect({ to: "/" });
  },
  component: ReportsPage,
});

/**
 * Lists reports as records rather than presenting speculative dashboard cards.
 * The Agent Workload report is live; later-phase reports stay clearly labelled.
 */
function ReportsPage() {
  const { can } = useAuth();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname !== "/reports") return <Outlet />;
  const reports = [
    { name: "Agent Workload", question: "Who is carrying what right now?", live: can("workloads.manage"), to: "/reports/agent-workload" as const },
    { name: "Conversion", question: "How many requests became bookings?", live: false, to: null },
    { name: "Booking Fees", question: "What did each pricing group generate?", live: false, to: null },
    { name: "Deadline Risk", question: "What is about to be missed?", live: false, to: null },
  ];
  return <div className="min-h-screen min-w-[1300px] bg-yb-canvas text-yb-ink"><AppHeader tabs={NAV_TABS} compact /><main className="px-[16px] pt-[14px] pb-[36px]"><header className="mb-[12px]"><div className="text-[10px] uppercase tracking-[1.4px] text-yb-muted3">Reports</div><h1 className="yb-page-title">Management reports</h1></header><section className="border-2 border-yb-line bg-white"><div className="flex h-[32px] items-center border-b border-yb-line bg-yb-panel-head px-[14px]"><div className="text-[10.5px] font-bold tracking-[1px] text-yb-panel-head-text">AVAILABLE REPORTS</div></div><table className="w-full table-fixed border-collapse text-[12px]"><thead><tr className="h-[30px] bg-yb-table-head text-yb-muted"><th className="px-[12px] text-left">Report</th><th className="text-left">What it answers</th><th className="px-[12px] text-left">Availability</th></tr></thead><tbody>{reports.map((report) => <tr key={report.name} className="h-[44px] border-t border-yb-line-row"><td className="px-[12px] font-bold">{report.live && report.to ? <Link to={report.to} className="text-yb-green underline">{report.name}</Link> : report.name}</td><td>{report.question}</td><td className="px-[12px]">{report.live ? <span className="font-bold text-yb-green">Live</span> : <span className="text-yb-muted3">Later phase</span>}</td></tr>)}</tbody></table></section></main></div>;
}
