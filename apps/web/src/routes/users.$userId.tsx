import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import {
  PHASE_ONE_ROLES,
  type EmployeeDetail,
  type PhaseOneRole,
  type StaffRole,
  type UpdateEmployeeInput,
} from "@yb-travel/shared";
import { AppHeader } from "../components/AppShell/AppHeader";
import { PrimaryButton, SecondaryButton } from "../components/AppShell/buttons";
import { requestWorkflowSettingsApi, usersApi } from "../lib/api";
import { NAV_TABS } from "../lib/navTabs";
import { getStoredUser, hasAdminRole } from "../lib/session";

export const Route = createFileRoute("/users/$userId")({
  beforeLoad: () => {
    if (!hasAdminRole(getStoredUser())) throw redirect({ to: "/" });
  },
  component: EmployeeDetailPage,
});

const ROLE_LABELS: Record<StaffRole, string> = {
  offshore_intake_employee: "Offshore Intake Employee",
  travel_agent: "Travel Agent",
  supervisor_manager: "Supervisor / Manager",
  ticketing_agent: "Ticketing Agent",
  finance_user: "Finance User",
  system_administrator: "System Administrator",
};
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const controlClass = "mt-[4px] h-[32px] w-full border border-yb-line-btn bg-white px-[8px] text-[12px] text-yb-ink outline-none focus:border-yb-green";

function fieldFromEmployee(employee: EmployeeDetail): UpdateEmployeeInput {
  return {
    name: employee.name,
    email: employee.email,
    phoneNumber: employee.phoneNumber ?? "",
    roles: employee.roles.filter((role): role is PhaseOneRole => PHASE_ONE_ROLES.includes(role as PhaseOneRole)),
    active: employee.active,
    availabilityStatus: employee.availabilityStatus,
    capacityLimit: employee.capacityLimit,
    highPriorityCapacityLimit: employee.highPriorityCapacityLimit,
    timezone: employee.timezone,
    workdays: employee.workdays,
    workdayStart: employee.workdayStart.slice(0, 5),
    workdayEnd: employee.workdayEnd.slice(0, 5),
    eligibleRequestTypeIds: employee.eligibleRequestTypeIds,
  };
}

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return <div><div className="mb-[4px] text-[10px] font-bold uppercase tracking-[0.1em] text-yb-muted4">{label}</div><div className="text-[13px] text-yb-ink2">{children}</div></div>;
}

function EmployeeDetailPage() {
  const { userId: userIdParam } = Route.useParams();
  const userId = Number(userIdParam);
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<UpdateEmployeeInput | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const employeeQuery = useQuery({
    queryKey: ["users", userId],
    queryFn: () => usersApi.get(userId),
    enabled: Number.isInteger(userId) && userId > 0,
  });
  const requestTypesQuery = useQuery({
    queryKey: ["request-workflow-settings", "active"],
    queryFn: requestWorkflowSettingsApi.listActive,
  });

  useEffect(() => {
    if (employeeQuery.data && !editing) setDraft(fieldFromEmployee(employeeQuery.data));
  }, [employeeQuery.data, editing]);

  const updateMutation = useMutation({
    mutationFn: (input: UpdateEmployeeInput) => usersApi.update(userId, input),
    onSuccess: (updated) => {
      queryClient.setQueryData(["users", userId], updated);
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      setDraft(fieldFromEmployee(updated));
      setEditing(false);
      setError(null);
      setNotice("Employee details, availability, and capacity were updated.");
    },
    onError: (caught: unknown) => setError(caught instanceof Error ? caught.message : "Could not update employee"),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!draft) return;
    if (draft.roles.length === 0) return setError("Select at least one employee role");
    if (draft.workdays.length === 0) return setError("Select at least one working day");
    if (draft.workdayStart === draft.workdayEnd) return setError("Working-day start and end times must be different");
    updateMutation.mutate(draft);
  }

  function toggleRole(role: PhaseOneRole) {
    setDraft((current) => current ? { ...current, roles: current.roles.includes(role) ? current.roles.filter((item) => item !== role) : [...current.roles, role] } : current);
  }

  if (employeeQuery.isLoading) {
    return <div className="min-h-screen bg-yb-page"><AppHeader tabs={NAV_TABS} /><div className="m-[22px] border border-yb-line bg-white p-[20px] text-[13px] text-yb-muted3">Loading employee…</div></div>;
  }
  if (employeeQuery.isError || !employeeQuery.data || !draft) {
    return <div className="min-h-screen bg-yb-page"><AppHeader tabs={NAV_TABS} /><div className="m-[22px] border border-yb-line bg-white p-[20px] text-[13px] text-yb-red">This employee could not be found.</div></div>;
  }
  const employee = employeeQuery.data;
  const capacityColor = employee.openRequestCount >= employee.capacityLimit ? "bg-yb-red" : "bg-yb-green";

  return (
    <div className="min-h-screen min-w-[1280px] bg-yb-page text-yb-ink">
      <AppHeader tabs={NAV_TABS} />
      <main className="px-[22px] pt-[14px] pb-[40px]">
        <div className="mb-[12px] flex items-end gap-[12px]">
          <div>
            <div className="text-[10px] font-bold tracking-[1.3px] text-yb-muted4">EMPLOYEE PROFILE</div>
            <div className="mt-[2px] flex items-center gap-[9px]"><h1 className="text-[25px] font-black">{employee.name}</h1><span className={`border px-[7px] py-[2px] text-[10.5px] font-bold ${employee.active ? "border-yb-green/30 bg-yb-success text-yb-green" : "border-yb-red/30 bg-red-50 text-yb-red"}`}>{employee.active ? "Active" : "Inactive"}</span></div>
            <div className="mt-[2px] text-[12px] text-yb-muted3">Created {new Date(employee.createdAt).toLocaleDateString()} · Employee #{employee.id}</div>
          </div>
          <div className="flex-1" />
          <Link to="/users" className="text-[12px] font-bold text-yb-green underline">Back to Employees</Link>
          {!editing && <PrimaryButton onClick={() => { setEditing(true); setNotice(null); }}>Edit employee</PrimaryButton>}
        </div>

        {notice && <div className="mb-[10px] border border-yb-green/30 bg-yb-success px-[12px] py-[8px] text-[12px] font-bold text-yb-green">{notice}</div>}

        {!editing ? (
          <>
            <section className="grid grid-cols-[1.35fr_0.65fr] border border-yb-line border-t-[3px] border-t-yb-green bg-white">
              <div className="border-r border-yb-line">
                <div className="border-b border-yb-line bg-yb-panel-head px-[14px] py-[8px] text-[10.5px] font-bold tracking-[1.1px] text-yb-panel-head-text">EMPLOYEE DETAILS</div>
                <div className="grid grid-cols-3 gap-x-[24px] gap-y-[18px] px-[15px] py-[15px]">
                  <DetailField label="Email">{employee.email}</DetailField>
                  <DetailField label="WhatsApp phone">{employee.phoneNumber ?? "Not provided"}</DetailField>
                  <DetailField label="Roles">{employee.roles.map((role) => ROLE_LABELS[role]).join(", ")}</DetailField>
                  <DetailField label="Availability"><span className="font-bold capitalize text-yb-green">{employee.availabilityStatus}</span></DetailField>
                  <DetailField label="Working timezone">{employee.timezone}</DetailField>
                  <DetailField label="Working hours">{employee.workdayStart.slice(0, 5)}–{employee.workdayEnd.slice(0, 5)}</DetailField>
                  <DetailField label="Working days">{employee.workdays.map((day) => DAYS[day]).join(", ")}</DetailField>
                  <DetailField label="Qualified request types">{employee.eligibleRequestTypes.length ? employee.eligibleRequestTypes.map((type) => type.name).join(", ") : "All active request types"}</DetailField>
                  <DetailField label="Last assigned">{employee.lastAssignedAt ? new Date(employee.lastAssignedAt).toLocaleString() : "No assignment yet"}</DetailField>
                  <DetailField label="Account access">{employee.active ? "Enabled" : "Disabled"}</DetailField>
                </div>
              </div>
              <aside className="p-[14px]">
                <div className="text-[10.5px] font-bold tracking-[1px] text-yb-muted4">CURRENT WORKLOAD</div>
                <div className="mt-[8px] flex items-baseline gap-[6px]"><span className="text-[30px] font-black">{employee.openRequestCount}</span><span className="text-[12px] text-yb-muted3">of {employee.capacityLimit} standard requests</span></div>
                <div className="mt-[8px] h-[8px] overflow-hidden bg-yb-toolbar"><div className={`h-full ${capacityColor}`} style={{ width: `${employee.capacityUsedPercent}%` }} /></div>
                <div className="mt-[5px] text-[11px] text-yb-muted3">{employee.capacityUsedPercent}% standard capacity used</div>
                <div className="mt-[13px] border-t border-yb-line-soft pt-[10px]"><div className="text-[10px] font-bold uppercase tracking-[0.1em] text-yb-muted4">High / urgent limit</div><div className="mt-[3px] text-[17px] font-black">{employee.highPriorityCapacityLimit}</div></div>
                <Link to="/assignment-settings" className="mt-[13px] block border border-yb-line-btn px-[9px] py-[7px] text-center text-[11.5px] font-bold text-yb-green">Open assignment settings</Link>
              </aside>
            </section>

            <section className="mt-[14px] border border-yb-line bg-white">
              <div className="flex items-center border-b border-yb-line bg-yb-panel-head px-[14px] py-[8px]"><div className="text-[10.5px] font-bold tracking-[1.1px] text-yb-panel-head-text">RECENT ASSIGNMENT ACTIVITY</div><div className="flex-1" /><div className="text-[11px] text-yb-muted3">Last 20 events</div></div>
              <table className="w-full border-collapse text-[12px]"><thead><tr className="bg-yb-table-head"><th className="px-[12px] py-[7px] text-left">Request</th><th className="px-[8px] py-[7px] text-left">Client</th><th className="px-[8px] py-[7px] text-left">Event</th><th className="px-[8px] py-[7px] text-left">Reason</th><th className="px-[12px] py-[7px] text-right">When</th></tr></thead><tbody>{employee.recentAssignmentActivity.map((activity) => <tr key={activity.id} className="border-t border-yb-line-row"><td className="px-[12px] py-[9px]"><Link to="/requests/$requestId" params={{ requestId: String(activity.requestId) }} className="font-bold text-yb-green underline">{activity.requestNumber}</Link></td><td className="px-[8px] py-[9px]">{activity.clientName}</td><td className="px-[8px] py-[9px] capitalize">{activity.eventType.replaceAll("_", " ")} · {activity.routingLevel}</td><td className="px-[8px] py-[9px] text-yb-muted3">{activity.explanation}</td><td className="px-[12px] py-[9px] text-right text-yb-muted3">{new Date(activity.createdAt).toLocaleString()}</td></tr>)}</tbody></table>
              {employee.recentAssignmentActivity.length === 0 && <div className="px-[14px] py-[24px] text-center text-[12px] text-yb-muted3">No requests have been assigned to this employee yet.</div>}
            </section>
          </>
        ) : (
          <form onSubmit={submit} className="border border-yb-line border-t-[3px] border-t-yb-green bg-white">
            <div className="border-b border-yb-line bg-yb-panel-head px-[14px] py-[9px]"><div className="text-[11px] font-bold tracking-[1px] text-yb-panel-head-text">EDIT EMPLOYEE, AVAILABILITY &amp; CAPACITY</div><div className="mt-[2px] text-[11px] text-yb-muted3">Changes affect future assignment recommendations immediately and are recorded in the audit history.</div></div>
            <div className="grid grid-cols-4 gap-[13px] px-[14px] py-[13px]">
              <label className="text-[11.5px] font-bold text-yb-muted">Name<input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={controlClass} /></label>
              <label className="text-[11.5px] font-bold text-yb-muted">Email<input required type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} className={controlClass} /></label>
              <label className="text-[11.5px] font-bold text-yb-muted">WhatsApp phone<input required type="tel" pattern="\+[1-9][0-9]{7,14}" placeholder="+251911234567" value={draft.phoneNumber} onChange={(event) => setDraft({ ...draft, phoneNumber: event.target.value })} className={controlClass} /></label>
              <label className="text-[11.5px] font-bold text-yb-muted">Account status<select value={draft.active ? "active" : "inactive"} onChange={(event) => setDraft({ ...draft, active: event.target.value === "active" })} className={controlClass}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
            </div>
            <div className="border-t border-yb-line-soft px-[14px] py-[12px]"><div className="mb-[7px] text-[11.5px] font-bold text-yb-muted">Employee roles</div><div className="flex gap-[9px]">{PHASE_ONE_ROLES.map((role) => <label key={role} className="flex items-center gap-[5px] border border-yb-line-btn px-[9px] py-[6px] text-[12px]"><input type="checkbox" checked={draft.roles.includes(role)} onChange={() => toggleRole(role)} />{ROLE_LABELS[role]}</label>)}</div></div>
            <div className="grid grid-cols-4 gap-[13px] border-t border-yb-line-soft px-[14px] py-[12px]">
              <label className="text-[11.5px] font-bold text-yb-muted">Availability<select value={draft.availabilityStatus} onChange={(event) => setDraft({ ...draft, availabilityStatus: event.target.value as UpdateEmployeeInput["availabilityStatus"] })} className={controlClass}><option value="available">Available</option><option value="unavailable">Unavailable</option><option value="absent">Absent</option></select></label>
              <label className="text-[11.5px] font-bold text-yb-muted">Standard capacity<input type="number" min={1} max={500} value={draft.capacityLimit} onChange={(event) => setDraft({ ...draft, capacityLimit: Number(event.target.value) })} className={controlClass} /></label>
              <label className="text-[11.5px] font-bold text-yb-muted">High / urgent capacity<input type="number" min={1} max={500} value={draft.highPriorityCapacityLimit} onChange={(event) => setDraft({ ...draft, highPriorityCapacityLimit: Number(event.target.value) })} className={controlClass} /></label>
              <label className="text-[11.5px] font-bold text-yb-muted">Timezone<input required value={draft.timezone} onChange={(event) => setDraft({ ...draft, timezone: event.target.value })} className={controlClass} /></label>
            </div>
            <div className="grid grid-cols-[0.7fr_0.7fr_2fr] gap-[13px] border-t border-yb-line-soft px-[14px] py-[12px]">
              <label className="text-[11.5px] font-bold text-yb-muted">Working day starts<input type="time" value={draft.workdayStart} onChange={(event) => setDraft({ ...draft, workdayStart: event.target.value })} className={controlClass} /></label>
              <label className="text-[11.5px] font-bold text-yb-muted">Working day ends<input type="time" value={draft.workdayEnd} onChange={(event) => setDraft({ ...draft, workdayEnd: event.target.value })} className={controlClass} /></label>
              <div className="text-[11.5px] font-bold text-yb-muted">Working days<div className="mt-[9px] flex gap-[9px]">{DAYS.map((day, index) => <label key={day} className="flex items-center gap-[4px] text-[11.5px] font-normal text-yb-ink"><input type="checkbox" checked={draft.workdays.includes(index)} onChange={(event) => setDraft({ ...draft, workdays: event.target.checked ? [...draft.workdays, index].sort() : draft.workdays.filter((item) => item !== index) })} />{day}</label>)}</div></div>
            </div>
            <div className="border-t border-yb-line-soft px-[14px] py-[12px]"><div className="text-[11.5px] font-bold text-yb-muted">Qualified request types</div><div className="mt-[7px] flex flex-wrap gap-[8px]">{(requestTypesQuery.data?.requestTypes ?? []).map((type) => <label key={type.id} className="flex items-center gap-[5px] border border-yb-line-soft bg-yb-toolbar px-[8px] py-[5px] text-[11.5px]"><input type="checkbox" checked={draft.eligibleRequestTypeIds.includes(type.id)} onChange={(event) => setDraft({ ...draft, eligibleRequestTypeIds: event.target.checked ? [...draft.eligibleRequestTypeIds, type.id] : draft.eligibleRequestTypeIds.filter((id) => id !== type.id) })} />{type.name}</label>)}</div><div className="mt-[5px] text-[10.5px] text-yb-muted3">No selection means qualified for every active request type.</div></div>
            {error && <div role="alert" className="mx-[14px] mb-[8px] text-[12px] font-bold text-yb-red">{error}</div>}
            <div className="flex justify-end gap-[9px] border-t border-yb-line bg-yb-panel-head px-[14px] py-[10px]"><SecondaryButton type="button" onClick={() => { setDraft(fieldFromEmployee(employee)); setEditing(false); setError(null); }}>Cancel</SecondaryButton><PrimaryButton type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? "Saving…" : "Save employee"}</PrimaryButton></div>
          </form>
        )}
      </main>
    </div>
  );
}
