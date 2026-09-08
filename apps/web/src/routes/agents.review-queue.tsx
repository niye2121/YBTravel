import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AppHeader } from "../components/AppShell/AppHeader";
import { SupervisorQueueTabs } from "../components/SupervisorQueueTabs";
import { supervisorApi, type SupervisorReviewItem, type SupervisorReviewOutcome } from "../lib/api";
import { NAV_TABS } from "../lib/navTabs";
import { getStoredUser, hasPermission } from "../lib/session";
import { useAuth } from "../lib/AuthContext";

export const Route = createFileRoute("/agents/review-queue")({
  beforeLoad: () => {
    if (!hasPermission(getStoredUser(), "exceptions.approve")) throw redirect({ to: "/" });
  },
  component: SupervisorReviewQueuePage,
});

const TYPE_LABELS: Record<SupervisorReviewItem["type"], string> = { pricing_override: "Pricing override", markup_change: "Markup change", waiver: "Waiver", assignment_override: "Assignment override", operational_exception: "Operational exception" };

/** Displays the append-only review queue and saves one retrospective decision. */
function SupervisorReviewQueuePage() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"unreviewed" | "reviewed" | "all">("unreviewed");
  const [selected, setSelected] = useState<SupervisorReviewItem | null>(null);
  const [outcome, setOutcome] = useState<SupervisorReviewOutcome>("approved");
  const [comment, setComment] = useState("");
  const reviewQuery = useQuery({ queryKey: ["supervisor", "reviews", status], queryFn: () => supervisorApi.reviews(status) });
  const reviewMutation = useMutation({
    mutationFn: () => supervisorApi.completeReview(selected!.id, outcome, comment),
    onSuccess: async () => {
      setSelected(null); setComment("");
      await queryClient.invalidateQueries({ queryKey: ["supervisor", "reviews"] });
    },
  });

  /** Submits the reviewer outcome only after the required comment is present. */
  function submit(event: FormEvent) {
    event.preventDefault();
    if (selected && comment.trim()) reviewMutation.mutate();
  }

  const counts = reviewQuery.data?.counts;
  return <div className="min-h-screen min-w-[1300px] bg-yb-canvas text-yb-ink"><AppHeader tabs={NAV_TABS} compact /><SupervisorQueueTabs unreviewedCount={counts?.unreviewed} /><main className="px-[16px] pt-[14px] pb-[36px]"><header className="mb-[12px]"><div className="text-[10px] uppercase tracking-[1.4px] text-yb-muted3">After-the-fact review</div><h1 className="yb-page-title">Supervisor review queue</h1><p className="mt-[3px] text-[12px] text-yb-muted3">Review records completed actions. They never block an agent from working.</p></header><nav className="mb-[10px] flex h-[34px] items-end gap-[20px] border-b border-yb-line bg-white px-[12px]">{(["unreviewed", "reviewed", "all"] as const).map((value) => <button key={value} type="button" onClick={() => setStatus(value)} className={`h-[34px] border-b-2 px-[4px] text-[12px] capitalize ${status === value ? "border-yb-gold font-bold text-yb-green" : "border-transparent text-yb-muted"}`}>{value === "unreviewed" ? "Awaiting review" : value} {counts?.[value] ? <span className="ml-[4px] tabular-nums">{counts[value]}</span> : null}</button>)}</nav><section className="border-2 border-yb-line bg-white"><div className="flex h-[32px] items-center border-b border-yb-line bg-yb-panel-head px-[14px]"><div className="text-[10.5px] font-bold tracking-[1px] text-yb-panel-head-text">COMPLETED ACTIONS FOR REVIEW</div><div className="flex-1" /><div className="text-[11px] text-yb-muted3">Append-only history</div></div><table className="w-full table-fixed border-collapse text-[12px]"><thead><tr className="h-[30px] bg-yb-table-head text-yb-muted"><th className="px-[12px] text-left">Item</th><th className="text-left">Type</th><th className="text-left">Reason</th><th className="text-left">Agent</th><th className="text-left">Occurred</th><th className="px-[12px] text-right">Outcome</th></tr></thead><tbody>{(reviewQuery.data?.items ?? []).map((item) => <tr key={item.id} className="h-[44px] border-t border-yb-line-row hover:bg-yb-row-hover"><td className="px-[12px]">{item.requestId ? can("requests.read") ? <Link to="/requests/$requestId" params={{ requestId: String(item.requestId) }} className="font-bold text-yb-green underline">{item.requestNumber}</Link> : <span className="font-bold">{item.requestNumber}</span> : <span className="font-bold">Review {item.id}</span>}<div className="mt-[2px] truncate text-[10px] text-yb-muted3">{item.clientName ?? item.summary}</div></td><td>{TYPE_LABELS[item.type]}</td><td><div className="truncate font-bold">{item.summary}</div><div className="mt-[2px] truncate text-[10px] text-yb-muted3">{item.reason}</div></td><td>{item.occurredByName}</td><td>{item.occurredAtLabel}</td><td className="px-[12px] text-right">{item.status === "unreviewed" ? <button type="button" onClick={() => { setSelected(item); setOutcome("approved"); setComment(""); }} className="font-bold text-yb-green underline">Review</button> : <span className="capitalize">{item.outcome?.replaceAll("_", " ")}</span>}</td></tr>)}</tbody></table>{reviewQuery.isLoading && <div className="px-[14px] py-[28px] text-center text-yb-muted3">Loading review queue…</div>}{!reviewQuery.isLoading && reviewQuery.data?.items.length === 0 && <div className="px-[14px] py-[28px] text-center"><div className="font-bold">Nothing awaiting review.</div><div className="mt-[3px] text-[12px] text-yb-muted3">Items appear here as overrides, waivers and completed exceptions occur.</div></div>}{selected && <form onSubmit={submit} className="border-t border-yb-line"><div className="h-[32px] border-b border-yb-line bg-yb-panel-head px-[14px] py-[8px] text-[10.5px] font-bold tracking-[1px] text-yb-panel-head-text">REVIEW {selected.requestNumber ?? selected.id}</div><div className="grid grid-cols-[180px_1fr] border-b border-yb-line-row"><div className="px-[12px] py-[10px] text-right text-[12px] text-yb-muted">Completed action</div><div className="px-[12px] py-[10px] text-[12px]"><div className="font-bold">{selected.summary}</div><div className="mt-[3px] text-yb-muted3">Default bypassed: {selected.overriddenRule}</div><div className="mt-[3px]">Reason: {selected.reason}</div></div></div><div className="grid grid-cols-[180px_1fr] border-b border-yb-line-row"><label htmlFor="review-outcome" className="px-[12px] py-[10px] text-right text-[12px] text-yb-muted">Outcome</label><div className="px-[12px] py-[8px]"><select id="review-outcome" value={outcome} onChange={(event) => setOutcome(event.target.value as SupervisorReviewOutcome)} className="h-[30px] w-[260px] border border-yb-line-btn bg-white px-[7px] text-[12px]"><option value="approved">Approved after review</option><option value="noted">Noted</option><option value="coaching_required">Coaching required</option><option value="rejected">Rejected after review</option></select></div></div><div className="grid grid-cols-[180px_1fr]"><label htmlFor="review-comment" className="px-[12px] py-[10px] text-right text-[12px] text-yb-muted">Review comment</label><div className="px-[12px] py-[8px]"><textarea id="review-comment" required value={comment} onChange={(event) => setComment(event.target.value)} className="min-h-[68px] w-full resize-y border border-yb-line-btn bg-white px-[8px] py-[6px] text-[12px]" /></div></div><div className="flex justify-end gap-[10px] border-t border-yb-line bg-yb-panel-head px-[14px] py-[9px]"><button type="button" onClick={() => setSelected(null)} className="h-[34px] border border-yb-line-btn bg-white px-[16px] text-[12px]">Cancel</button><button type="submit" disabled={!comment.trim() || reviewMutation.isPending} className="h-[34px] border border-yb-green-dark bg-yb-green px-[16px] text-[12px] font-bold text-white disabled:border-yb-line-btn disabled:bg-yb-line-soft2">Save review</button></div></form>}</section></main></div>;
}
