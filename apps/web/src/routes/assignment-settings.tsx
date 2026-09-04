import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { AppHeader } from "../components/AppShell/AppHeader";
import { PrimaryButton, SecondaryButton } from "../components/AppShell/buttons";
import {
  assignmentSettingsApi,
  requestWorkflowSettingsApi,
  type AssignmentSettings,
  type StaffRoutingProfile,
} from "../lib/api";
import { NAV_TABS } from "../lib/navTabs";
import { getStoredUser, hasAdminRole } from "../lib/session";

export const Route = createFileRoute("/assignment-settings")({
  beforeLoad: () => {
    if (!hasAdminRole(getStoredUser())) throw redirect({ to: "/" });
  },
  component: AssignmentSettingsPage,
});

const inputClass = "mt-[4px] h-[32px] w-full border border-yb-line-btn bg-white px-[8px] text-[12px] text-yb-ink outline-none focus:border-yb-green";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ROLE_LABELS: Record<string, string> = {
  offshore_intake_employee: "Offshore Intake Employee",
  travel_agent: "Travel Agent",
  system_administrator: "System Administrator",
  supervisor_manager: "Supervisor / Manager",
  ticketing_agent: "Ticketing Agent",
  finance_user: "Finance User",
};

function cloneSettings(value: AssignmentSettings): AssignmentSettings {
  return JSON.parse(JSON.stringify(value)) as AssignmentSettings;
}

function AssignmentSettingsPage() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({ queryKey: ["assignment-settings"], queryFn: assignmentSettingsApi.get });
  const requestSettingsQuery = useQuery({ queryKey: ["request-workflow-settings", "active"], queryFn: requestWorkflowSettingsApi.listActive });
  const [draft, setDraft] = useState<AssignmentSettings | null>(null);
  const saveMutation = useMutation({
    mutationFn: assignmentSettingsApi.update,
    onSuccess: async (saved) => {
      setDraft(cloneSettings(saved));
      queryClient.setQueryData(["assignment-settings"], saved);
      await queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
  });

  useEffect(() => {
    if (settingsQuery.data) setDraft(cloneSettings(settingsQuery.data));
  }, [settingsQuery.data]);

  function updateProfile(userId: number, patch: Partial<StaffRoutingProfile>) {
    setDraft((current) => current ? {
      ...current,
      staffProfiles: current.staffProfiles.map((profile) => profile.userId === userId ? { ...profile, ...patch } : profile),
    } : current);
  }

  if (settingsQuery.isLoading || !draft) {
    return <div className="min-h-screen bg-yb-page"><AppHeader tabs={NAV_TABS} /><div className="m-[22px] border border-yb-line bg-white p-[20px] text-[13px] text-yb-muted3">Loading assignment settings…</div></div>;
  }

  return (
    <div className="min-h-screen min-w-[1280px] bg-yb-page text-yb-ink">
      <AppHeader tabs={NAV_TABS} />
      <main className="px-[22px] pt-[15px] pb-[40px]">
        <div className="mb-[12px] flex items-end gap-[12px]">
          <div>
            <div className="text-[10px] font-bold tracking-[1.3px] text-yb-muted4">SYSTEM ADMINISTRATION</div>
            <h1 className="mt-[2px] text-[25px] font-black">Assignment &amp; Fallback</h1>
            <p className="mt-[3px] text-[12.5px] text-yb-muted3">Configure explainable preferred, secondary, team and escalation routing.</p>
          </div>
          <div className="flex-1" />
          <Link to="/setup" className="text-[12px] font-bold text-yb-green underline">Back to Setup</Link>
        </div>

        <section className="border border-yb-line border-t-[3px] border-t-yb-green bg-white">
          <div className="grid grid-cols-4 gap-[14px] border-b border-yb-line px-[16px] py-[14px]">
            <label className="text-[11.5px] font-bold text-yb-muted">Assignment mode
              <select value={draft.assignmentMode} onChange={(event) => setDraft({ ...draft, assignmentMode: event.target.value as AssignmentSettings["assignmentMode"] })} className={inputClass}>
                <option value="recommend_only">Recommend; human confirms</option>
                <option value="automatic">Automatically assign</option>
              </select>
            </label>
            <label className="text-[11.5px] font-bold text-yb-muted">Team selection
              <select value={draft.teamStrategy} onChange={(event) => setDraft({ ...draft, teamStrategy: event.target.value as AssignmentSettings["teamStrategy"] })} className={inputClass}>
                <option value="lowest_workload">Lowest workload</option>
                <option value="round_robin">Round robin</option>
              </select>
            </label>
            <label className="flex items-center gap-[8px] border border-yb-line-soft bg-yb-toolbar px-[10px] text-[12px] font-bold">
              <input type="checkbox" checked={draft.continuityEnabled} onChange={(event) => setDraft({ ...draft, continuityEnabled: event.target.checked })} /> Prefer an agent already handling this client
            </label>
            <label className="flex items-center gap-[8px] border border-yb-line-soft bg-yb-toolbar px-[10px] text-[12px] font-bold">
              <input type="checkbox" checked={draft.workingHoursEnabled} onChange={(event) => setDraft({ ...draft, workingHoursEnabled: event.target.checked })} /> Enforce staff working hours
            </label>
          </div>

          <div className="grid grid-cols-2 gap-[18px] border-b border-yb-line px-[16px] py-[13px]">
            <div>
              <div className="mb-[7px] text-[10.5px] font-bold tracking-[1px] text-yb-panel-head-text">ELIGIBLE ASSIGNMENT ROLES</div>
              {["travel_agent", "offshore_intake_employee"].map((role) => <label key={role} className="mr-[18px] inline-flex items-center gap-[6px] text-[12px]"><input type="checkbox" checked={draft.eligibleRoles.includes(role)} onChange={(event) => setDraft({ ...draft, eligibleRoles: event.target.checked ? [...draft.eligibleRoles, role] : draft.eligibleRoles.filter((item) => item !== role) })} />{ROLE_LABELS[role]}</label>)}
            </div>
            <div>
              <div className="mb-[7px] text-[10.5px] font-bold tracking-[1px] text-yb-panel-head-text">FINAL ESCALATION ROLES</div>
              {["system_administrator", "offshore_intake_employee"].map((role) => <label key={role} className="mr-[18px] inline-flex items-center gap-[6px] text-[12px]"><input type="checkbox" checked={draft.escalationRoles.includes(role)} onChange={(event) => setDraft({ ...draft, escalationRoles: event.target.checked ? [...draft.escalationRoles, role] : draft.escalationRoles.filter((item) => item !== role) })} />{ROLE_LABELS[role]}</label>)}
            </div>
          </div>

          <div className="border-b border-yb-line bg-yb-panel-head px-[16px] py-[8px] text-[10.5px] font-bold tracking-[1.1px] text-yb-panel-head-text">FALLBACK TIMING BY URGENCY</div>
          <div className="grid grid-cols-3 gap-[12px] px-[16px] py-[13px]">
            {draft.urgencyPolicies.map((policy) => (
              <div key={policy.urgencyLevelId} className="border border-yb-line-soft p-[10px]">
                <div className="mb-[8px] text-[13px] font-black">{policy.urgencyName}</div>
                <div className="grid grid-cols-3 gap-[8px]">
                  {(["preferredWaitMinutes", "secondaryWaitMinutes", "escalationWaitMinutes"] as const).map((field, index) => <label key={field} className="text-[10.5px] text-yb-muted">{["Preferred", "Secondary", "Escalate"][index]} (min)<input type="number" min={0} max={field === "escalationWaitMinutes" ? 10080 : 1440} value={policy[field]} onChange={(event) => setDraft({ ...draft, urgencyPolicies: draft.urgencyPolicies.map((item) => item.urgencyLevelId === policy.urgencyLevelId ? { ...item, [field]: Number(event.target.value) } : item) })} className={inputClass} /></label>)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-[14px] border border-yb-line bg-white">
          <div className="border-b border-yb-line bg-yb-panel-head px-[14px] py-[8px]"><div className="text-[10.5px] font-bold tracking-[1.1px] text-yb-panel-head-text">STAFF AVAILABILITY, CAPACITY &amp; QUALIFICATIONS</div><div className="mt-[2px] text-[11px] text-yb-muted3">An empty request-type selection means the staff member may handle every active request type.</div></div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11.5px]">
              <thead><tr className="bg-yb-table-head"><th className="px-[10px] py-[7px] text-left">Staff</th><th className="px-[8px] py-[7px] text-left">Availability</th><th className="px-[8px] py-[7px] text-left">Capacity</th><th className="px-[8px] py-[7px] text-left">High/Urgent</th><th className="px-[8px] py-[7px] text-left">Working hours</th><th className="px-[8px] py-[7px] text-left">Working days</th><th className="px-[8px] py-[7px] text-left">Request types</th></tr></thead>
              <tbody>{draft.staffProfiles.map((profile) => (
                <tr key={profile.userId} className="align-top border-t border-yb-line-row">
                  <td className="px-[10px] py-[9px]"><label className="flex gap-[6px] font-bold"><input type="checkbox" checked={profile.active} onChange={(event) => updateProfile(profile.userId, { active: event.target.checked })} />{profile.name}</label><div className="mt-[2px] text-[10px] text-yb-muted3">{profile.roles.map((role) => ROLE_LABELS[role] ?? role).join(", ")} · {profile.openRequestCount} open</div></td>
                  <td className="px-[8px] py-[8px]"><select value={profile.availabilityStatus} onChange={(event) => updateProfile(profile.userId, { availabilityStatus: event.target.value as StaffRoutingProfile["availabilityStatus"] })} className="h-[29px] border border-yb-line-btn bg-white px-[6px]"><option value="available">Available</option><option value="unavailable">Unavailable</option><option value="absent">Absent</option></select></td>
                  <td className="px-[8px] py-[8px]"><input aria-label={`${profile.name} capacity`} type="number" min={1} max={500} value={profile.capacityLimit} onChange={(event) => updateProfile(profile.userId, { capacityLimit: Number(event.target.value) })} className="h-[29px] w-[58px] border border-yb-line-btn px-[6px]" /></td>
                  <td className="px-[8px] py-[8px]"><input aria-label={`${profile.name} high priority capacity`} type="number" min={1} max={500} value={profile.highPriorityCapacityLimit} onChange={(event) => updateProfile(profile.userId, { highPriorityCapacityLimit: Number(event.target.value) })} className="h-[29px] w-[58px] border border-yb-line-btn px-[6px]" /></td>
                  <td className="px-[8px] py-[8px]"><input aria-label={`${profile.name} timezone`} value={profile.timezone} onChange={(event) => updateProfile(profile.userId, { timezone: event.target.value })} className="h-[29px] w-[135px] border border-yb-line-btn px-[6px]" /><div className="mt-[4px] flex gap-[4px]"><input type="time" value={profile.workdayStart.slice(0,5)} onChange={(event) => updateProfile(profile.userId, { workdayStart: event.target.value })} className="h-[27px] border border-yb-line-btn px-[4px]" /><input type="time" value={profile.workdayEnd.slice(0,5)} onChange={(event) => updateProfile(profile.userId, { workdayEnd: event.target.value })} className="h-[27px] border border-yb-line-btn px-[4px]" /></div></td>
                  <td className="px-[8px] py-[8px]"><div className="grid grid-cols-4 gap-x-[5px] gap-y-[3px]">{DAYS.map((day, index) => <label key={day} className="flex items-center gap-[3px] text-[10px]"><input type="checkbox" checked={profile.workdays.includes(index)} onChange={(event) => updateProfile(profile.userId, { workdays: event.target.checked ? [...profile.workdays, index].sort() : profile.workdays.filter((item) => item !== index) })} />{day}</label>)}</div></td>
                  <td className="px-[8px] py-[8px]"><div className="grid grid-cols-2 gap-x-[7px] gap-y-[3px]">{(requestSettingsQuery.data?.requestTypes ?? []).map((type) => <label key={type.id} className="flex items-start gap-[3px] text-[10px]"><input type="checkbox" checked={profile.eligibleRequestTypeIds.includes(type.id)} onChange={(event) => updateProfile(profile.userId, { eligibleRequestTypeIds: event.target.checked ? [...profile.eligibleRequestTypeIds, type.id] : profile.eligibleRequestTypeIds.filter((id) => id !== type.id) })} />{type.name}</label>)}</div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>

        <div className="mt-[12px] flex items-center gap-[10px] border border-yb-line bg-yb-panel-head px-[14px] py-[10px]">
          <div className="text-[11.5px] text-yb-muted3">Preferred and secondary representatives remain configurable on each client profile. Every confirmed assignment records the recommendation and any override.</div>
          <div className="flex-1" />
          {saveMutation.isSuccess && <span className="text-[12px] font-bold text-yb-green">Settings saved</span>}
          <SecondaryButton type="button" onClick={() => settingsQuery.data && setDraft(cloneSettings(settingsQuery.data))}>Reset</SecondaryButton>
          <PrimaryButton type="button" disabled={saveMutation.isPending || draft.eligibleRoles.length === 0 || draft.escalationRoles.length === 0} onClick={() => saveMutation.mutate(draft)}>{saveMutation.isPending ? "Saving…" : "Save assignment rules"}</PrimaryButton>
        </div>
        {saveMutation.isError && <div role="alert" className="mt-[8px] text-[12px] font-bold text-yb-red">{saveMutation.error instanceof Error ? saveMutation.error.message : "Could not save assignment rules"}</div>}
      </main>
    </div>
  );
}
