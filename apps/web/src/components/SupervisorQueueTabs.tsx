import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "../lib/AuthContext";

/**
 * Renders the Agents section's visible second-level queues. The links remain
 * visible at rest so workload, review work and reporting cannot be overlooked.
 */
export function SupervisorQueueTabs({ unreviewedCount }: { unreviewedCount?: number }) {
  const { can } = useAuth();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const items = [
    can("workloads.manage") ? { label: "Agent workload", to: "/agents/workload" as const, count: undefined } : null,
    can("exceptions.approve") ? { label: "Supervisor review", to: "/agents/review-queue" as const, count: unreviewedCount } : null,
    can("workloads.manage") ? { label: "Workload report", to: "/reports/agent-workload" as const, count: undefined } : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);
  return (
    <nav aria-label="Agents and supervisor queues" className="flex h-[44px] items-end gap-[24px] border-b border-yb-line bg-white px-[24px]">
      {items.map((item) => (
        <Link key={item.to} to={item.to} className={`flex h-full items-center gap-[7px] border-b-2 text-[13.5px] ${pathname === item.to ? "border-yb-green font-semibold text-yb-green" : "border-transparent text-yb-muted"}`}>
          {item.label}{item.count ? <span className="font-bold tabular-nums text-yb-red">{item.count}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
