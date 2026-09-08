import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "../components/AppShell/AppHeader";
import { SupervisorQueueTabs } from "../components/SupervisorQueueTabs";
import { requestsApi, supervisorApi } from "../lib/api";
import { NAV_TABS } from "../lib/navTabs";
import { getStoredUser, hasPermission } from "../lib/session";
import { useAuth } from "../lib/AuthContext";

export const Route = createFileRoute("/agents/workload")({
  beforeLoad: () => {
    if (!hasPermission(getStoredUser(), "workloads.manage")) throw redirect({ to: "/" });
  },
  component: AgentWorkloadPage,
});

/** Displays live agent workload and provides the established request reassignment action. */
function AgentWorkloadPage() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [showAll, setShowAll] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const workloadQuery = useQuery({ queryKey: ["supervisor", "workload", showAll], queryFn: () => supervisorApi.workload(showAll) });
  const reviewsQuery = useQuery({ queryKey: ["supervisor", "reviews", "unreviewed"], queryFn: () => supervisorApi.reviews("unreviewed"), enabled: can("exceptions.approve") });
  const requestsQuery = useQuery({ queryKey: ["requests"], queryFn: requestsApi.list, enabled: can("requests.read") });
  const staffQuery = useQuery({ queryKey: ["requests", "assignable-staff"], queryFn: requestsApi.listAssignableStaff, enabled: can("requests.assign_any") });
  const assignMutation = useMutation({
    mutationFn: ({ requestId, assignedUserId }: { requestId: number; assignedUserId: number }) => requestsApi.assign(requestId, assignedUserId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["supervisor", "workload"] }),
        queryClient.invalidateQueries({ queryKey: ["supervisor", "reviews"] }),
        queryClient.invalidateQueries({ queryKey: ["requests"] }),
      ]);
    },
  });
  const selectedRequests = (requestsQuery.data ?? []).filter((request) => request.assignedUserId === selectedAgentId && !["completed", "cancelled"].includes(request.requestStatusCode));

  return (
    <div className="min-h-screen min-w-[1300px] bg-yb-canvas text-yb-ink">
      <AppHeader tabs={NAV_TABS} compact />
      <SupervisorQueueTabs unreviewedCount={reviewsQuery.data?.counts.unreviewed} />
      <main className="px-[16px] pt-[14px] pb-[36px]">
        <header className="mb-[12px] flex items-end gap-[12px]">
          <div><div className="text-[10px] uppercase tracking-[1.4px] text-yb-muted3">Agents and supervisor</div><h1 className="yb-page-title">Agent workload</h1></div>
          <div className="flex-1" />
          <button type="button" onClick={() => setShowAll((value) => !value)} className="h-[30px] border border-yb-line-btn bg-white px-[12px] text-[11.5px] underline">{showAll ? "Show open work only" : "Show all agents"}</button>
        </header>
        <section className="border-2 border-yb-line bg-white">
          <div className="flex h-[32px] items-center border-b border-yb-line bg-yb-panel-head px-[14px]"><div className="text-[10.5px] font-bold tracking-[1px] text-yb-panel-head-text">CURRENT TEAM WORKLOAD</div><div className="flex-1" /><div className="text-[11px] text-yb-muted3">Select an agent to manage their requests</div></div>
          <table className="w-full table-fixed border-collapse text-[12px]"><thead><tr className="h-[30px] bg-yb-table-head text-yb-muted"><th className="px-[12px] text-left">Agent</th><th className="text-right">Open requests</th><th className="text-right">Due today</th><th className="text-right">Overdue</th><th className="text-right">Escalated</th><th className="text-right">Capacity</th><th className="px-[12px] text-right">Oldest untouched</th></tr></thead>
            <tbody>{(workloadQuery.data ?? []).map((row) => <tr key={row.userId} onClick={() => setSelectedAgentId(row.userId)} className={`h-[44px] cursor-pointer border-t border-yb-line-row hover:bg-yb-row-hover ${selectedAgentId === row.userId ? "bg-yb-row-hover" : ""}`}><td className="px-[12px]"><button type="button" className="font-bold text-yb-green underline">{row.agentName}</button><div className="mt-[2px] text-[10px] capitalize text-yb-muted3">{row.availabilityStatus}</div></td><td className="text-right font-bold tabular-nums">{row.openRequests}</td><td className="text-right tabular-nums">{row.dueToday}</td><td className="text-right font-bold tabular-nums text-yb-red">{row.overdue}</td><td className="text-right font-bold tabular-nums text-yb-red">{row.escalated}</td><td className="text-right tabular-nums">{row.openRequests} / {row.capacityLimit}</td><td className="px-[12px] text-right text-yb-muted3">{row.oldestUntouchedLabel}</td></tr>)}</tbody>
          </table>
          {workloadQuery.isLoading && <div className="px-[14px] py-[28px] text-center text-[12px] text-yb-muted3">Loading team workload…</div>}
          {!workloadQuery.isLoading && workloadQuery.data?.length === 0 && <div className="px-[14px] py-[28px] text-center"><div className="font-bold">No agents with open work.</div><button type="button" onClick={() => setShowAll(true)} className="mt-[4px] text-yb-green underline">Show all agents</button></div>}
          {selectedAgentId !== null && can("requests.read") && <div className="border-t border-yb-line"><div className="flex h-[32px] items-center border-b border-yb-line bg-yb-panel-head px-[14px]"><div className="text-[10.5px] font-bold tracking-[1px] text-yb-panel-head-text">ASSIGNED OPEN REQUESTS</div><div className="flex-1" /><div className="text-[11px] text-yb-muted3">{can("requests.assign_any") ? "Reassignment is recorded and overrides enter supervisor review" : "Read-only request workload"}</div></div><table className="w-full table-fixed border-collapse text-[12px]"><thead><tr className="h-[30px] bg-yb-table-head text-yb-muted"><th className="px-[12px] text-left">Request</th><th className="text-left">Client</th><th className="text-left">Trip</th><th className="text-left">Status</th><th className="px-[12px] text-left">Assigned to</th></tr></thead><tbody>{selectedRequests.map((request) => <tr key={request.id} className="h-[44px] border-t border-yb-line-row"><td className="px-[12px]"><Link to="/requests/$requestId" params={{ requestId: String(request.id) }} className="font-bold text-yb-green underline">{request.requestNumber}</Link></td><td>{request.clientName}</td><td>{request.tripSummary}</td><td>{request.requestStatusName}</td><td className="px-[12px]">{can("requests.assign_any") ? <select aria-label={`Reassign ${request.requestNumber}`} value={request.assignedUserId ?? ""} disabled={assignMutation.isPending} onChange={(event) => assignMutation.mutate({ requestId: request.id, assignedUserId: Number(event.target.value) })} className="h-[30px] w-full border border-yb-line-btn bg-white px-[7px] text-[11.5px]">{(staffQuery.data ?? []).map((staff) => <option key={staff.id} value={staff.id}>{staff.name}</option>)}</select> : request.assignedUserName}</td></tr>)}</tbody></table>{selectedRequests.length === 0 && <div className="px-[14px] py-[24px] text-center text-[12px] text-yb-muted3">This agent has no open assigned requests.</div>}</div>}
        </section>
      </main>
    </div>
  );
}
