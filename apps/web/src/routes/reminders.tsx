import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Check, Clock3 } from "lucide-react";
import { useState } from "react";
import { AppHeader } from "../components/AppShell/AppHeader";
import { remindersApi, requestsApi, type ReminderRecord, type ReminderState } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { NAV_TABS } from "../lib/navTabs";
import { getStoredUser, hasPermission } from "../lib/session";

export const Route = createFileRoute("/reminders")({
  beforeLoad: () => {
    if (!hasPermission(getStoredUser(), "notifications.read")) throw redirect({ to: "/" });
  },
  component: RemindersPage,
});

type StateFilter = ReminderState | "active" | "all";

const filters: Array<{ value: StateFilter; label: string }> = [
  { value: "active", label: "Active" },
  { value: "due", label: "Due soon" },
  { value: "overdue", label: "Overdue" },
  { value: "escalated", label: "Escalated" },
  { value: "pending", label: "Upcoming" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "resolved", label: "Resolved" },
];

const stateLabel: Record<ReminderState, string> = {
  pending: "Upcoming",
  due: "Due soon",
  overdue: "Overdue",
  escalated: "Escalated",
  acknowledged: "Acknowledged",
  resolved: "Resolved",
};

const typeLabel: Record<ReminderRecord["type"], string> = {
  unanswered_inquiry: "Unanswered inquiry",
  missing_information: "Missing information",
  next_action: "Next action",
  onboarding_task: "Onboarding task",
};

function deadlineLabel(reminder: ReminderRecord): string {
  const due = new Date(reminder.dueAt);
  const minutes = Math.round((due.getTime() - Date.now()) / 60_000);
  if (reminder.state === "acknowledged") return `Acknowledged ${new Date(reminder.acknowledgedAt ?? reminder.updatedAt).toLocaleString()}`;
  if (reminder.state === "resolved") return "Resolved automatically";
  if (minutes < -1_440) return `${Math.floor(Math.abs(minutes) / 1_440)}d overdue`;
  if (minutes < -60) return `${Math.floor(Math.abs(minutes) / 60)}h overdue`;
  if (minutes < 0) return `${Math.abs(minutes)}m overdue`;
  if (minutes < 60) return `Due in ${minutes}m`;
  if (minutes < 1_440) return `Due in ${Math.floor(minutes / 60)}h`;
  return due.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function stateClass(state: ReminderState): string {
  if (state === "escalated") return "border-yb-red bg-[#fff3f1] text-yb-red";
  if (state === "overdue") return "border-[#c87a22] bg-[#fff7e8] text-[#82500e]";
  if (state === "due") return "border-yb-gold-border bg-[#fff8df] text-yb-gold-text";
  if (state === "acknowledged" || state === "resolved") return "border-yb-line bg-yb-table-head text-yb-muted3";
  return "border-yb-line bg-white text-yb-muted";
}

function RemindersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, can } = useAuth();
  const [state, setState] = useState<StateFilter>("active");
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const canAssign = can("requests.assign_any");
  const queryKey = ["reminders", state, scope, user?.id];
  const remindersQuery = useQuery({
    queryKey,
    queryFn: () => remindersApi.list(state, scope),
    refetchInterval: 30_000,
  });
  const staffQuery = useQuery({
    queryKey: ["requests", "assignable-staff"],
    queryFn: requestsApi.listAssignableStaff,
    enabled: canAssign,
  });
  const acknowledgeMutation = useMutation({
    mutationFn: remindersApi.acknowledge,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["reminders"] }),
        queryClient.invalidateQueries({ queryKey: ["staff-notifications"] }),
      ]);
    },
  });
  const assignMutation = useMutation({
    mutationFn: ({ id, assignedUserId }: { id: string; assignedUserId: number }) => remindersApi.reassign(id, assignedUserId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reminders"] }),
  });

  function openReminder(reminder: ReminderRecord) {
    if (reminder.requestId) {
      void navigate({ to: "/requests/$requestId", params: { requestId: String(reminder.requestId) } });
    } else if (reminder.clientId) {
      void navigate({ to: "/clients/$clientId", params: { clientId: String(reminder.clientId) } });
    }
  }

  const counts = remindersQuery.data?.counts;
  const reminders = remindersQuery.data?.reminders ?? [];

  return (
    <div className="min-h-screen min-w-[1180px] bg-yb-canvas text-yb-ink">
      <AppHeader tabs={NAV_TABS} compact />
      <main className="px-[16px] pt-[14px] pb-[36px]">
        <header className="mb-[12px] flex items-end gap-[12px]">
          <div className="flex h-[22px] w-[22px] items-center justify-center border border-yb-line-btn bg-white" aria-hidden="true">
            <Clock3 size={13} className="text-yb-green" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[1.4px] text-yb-muted3">Daily work management</div>
            <div className="flex items-baseline gap-[8px]">
              <h1 className="yb-page-title">Reminders</h1>
              <span className="text-[12px] text-yb-muted3">{counts?.active ?? 0} active</span>
            </div>
          </div>
          <div className="flex-1" />
          {canAssign && (
            <div className="flex border border-yb-line-btn bg-white text-[12px]">
              <button type="button" onClick={() => setScope("mine")} className={`px-[12px] py-[6px] ${scope === "mine" ? "bg-yb-green font-bold text-white" : "text-yb-ink2"}`}>My reminders</button>
              <button type="button" onClick={() => setScope("all")} className={`px-[12px] py-[6px] ${scope === "all" ? "bg-yb-green font-bold text-white" : "text-yb-ink2"}`}>Team reminders</button>
            </div>
          )}
        </header>

        <nav aria-label="Reminder filters" className="mb-[12px] flex h-[34px] items-end gap-[20px] border-b border-yb-line bg-white px-[12px]">
          {filters.map((filter) => {
            const count = filter.value === "all" ? undefined : counts?.[filter.value];
            return (
              <button key={filter.value} type="button" onClick={() => setState(filter.value)} className={`flex h-[34px] items-center gap-[6px] border-b-2 text-[12px] ${state === filter.value ? "border-yb-green font-bold text-yb-green" : "border-transparent text-yb-muted"}`}>
                {filter.label}{count !== undefined && <span className="text-[11px] tabular-nums text-yb-muted4">{count}</span>}
              </button>
            );
          })}
        </nav>

        <section className="yb-card overflow-hidden border border-yb-line border-t-[3px] border-t-yb-green bg-white">
          <div className="flex items-center border-b border-yb-line bg-yb-panel-head px-[14px] py-[8px]">
            <div className="text-[10.5px] font-bold tracking-[1px] text-yb-panel-head-text">REMINDER QUEUE</div>
            <div className="flex-1" />
            <div className="text-[11px] text-yb-muted3">{reminders.length} shown · refreshes automatically</div>
          </div>
          <table className="w-full table-fixed border-collapse text-[12px]">
            <thead>
              <tr className="bg-yb-table-head text-yb-muted">
                <th className="w-[118px] border-b border-yb-line px-[12px] py-[7px] text-left font-bold">Status</th>
                <th className="w-[155px] border-b border-yb-line px-[8px] py-[7px] text-left font-bold">Type</th>
                <th className="border-b border-yb-line px-[8px] py-[7px] text-left font-bold">Reminder</th>
                <th className="w-[165px] border-b border-yb-line px-[8px] py-[7px] text-left font-bold">Deadline</th>
                <th className="w-[170px] border-b border-yb-line px-[8px] py-[7px] text-left font-bold">Assigned to</th>
                <th className="w-[118px] border-b border-yb-line px-[12px] py-[7px] text-right font-bold">Action</th>
              </tr>
            </thead>
            <tbody>
              {reminders.map((reminder) => {
                const active = !["acknowledged", "resolved"].includes(reminder.state);
                return (
                  <tr key={reminder.id} onClick={() => openReminder(reminder)} className="cursor-pointer hover:bg-yb-row-hover">
                    <td className="border-b border-yb-line-row px-[12px] py-[9px]">
                      <span className={`inline-flex items-center gap-[5px] border px-[7px] py-[3px] text-[10px] font-bold uppercase tracking-[0.4px] ${stateClass(reminder.state)}`}>
                        {reminder.state === "escalated" && <AlertTriangle size={11} />}{stateLabel[reminder.state]}
                      </span>
                    </td>
                    <td className="border-b border-yb-line-row px-[8px] py-[9px] text-yb-muted">{typeLabel[reminder.type]}</td>
                    <td className="border-b border-yb-line-row px-[8px] py-[9px]">
                      <div className="font-bold text-yb-ink2">{reminder.title}</div>
                      <div className="mt-[2px] truncate text-[11px] text-yb-muted3">{reminder.message}</div>
                    </td>
                    <td className={`border-b border-yb-line-row px-[8px] py-[9px] font-bold tabular-nums ${reminder.state === "escalated" || reminder.state === "overdue" ? "text-yb-red" : "text-yb-muted"}`}>
                      {deadlineLabel(reminder)}
                    </td>
                    <td className="border-b border-yb-line-row px-[8px] py-[9px]" onClick={(event) => event.stopPropagation()}>
                      {canAssign ? (
                        <select value={reminder.assignedUserId} disabled={assignMutation.isPending || !active} onChange={(event) => assignMutation.mutate({ id: reminder.id, assignedUserId: Number(event.target.value) })} className="h-[27px] w-full border border-yb-line-btn bg-white px-[6px] text-[11px] disabled:bg-yb-table-head">
                          {(staffQuery.data ?? []).map((staff) => <option key={staff.id} value={staff.id}>{staff.name}</option>)}
                        </select>
                      ) : reminder.assignedUserName}
                    </td>
                    <td className="border-b border-yb-line-row px-[12px] py-[9px] text-right" onClick={(event) => event.stopPropagation()}>
                      {active ? (
                        <button type="button" disabled={acknowledgeMutation.isPending} onClick={() => acknowledgeMutation.mutate(reminder.id)} className="inline-flex items-center gap-[5px] border border-yb-green bg-white px-[8px] py-[4px] text-[10.5px] font-bold text-yb-green hover:bg-yb-row-hover disabled:text-yb-muted4">
                          <Check size={12} /> Acknowledge
                        </button>
                      ) : <span className="text-[11px] text-yb-muted4">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {remindersQuery.isLoading && <div className="px-[14px] py-[30px] text-center text-[12px] text-yb-muted3">Loading reminders…</div>}
          {!remindersQuery.isLoading && reminders.length === 0 && <div className="px-[14px] py-[32px] text-center"><div className="text-[13px] font-bold text-yb-ink2">No reminders in this view.</div><div className="mt-[3px] text-[12px] text-yb-muted3">New request deadlines and onboarding tasks will appear here automatically.</div></div>}
          {remindersQuery.isError && <div role="alert" className="border-l-2 border-yb-red bg-[#fff3f1] px-[14px] py-[9px] text-[12px] text-yb-red">{remindersQuery.error instanceof Error ? remindersQuery.error.message : "Could not load reminders"}</div>}
        </section>
      </main>
    </div>
  );
}
