import { Link, Outlet, createFileRoute, redirect, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { PHASE_ONE_ROLES, type PhaseOneRole, type StaffPermission, type StaffRole } from "@yb-travel/shared";
import { AppHeader } from "../components/AppShell/AppHeader";
import { PrimaryButton, SecondaryButton } from "../components/AppShell/buttons";
import { requestWorkflowSettingsApi, usersApi } from "../lib/api";
import { getStoredUser, hasPermission } from "../lib/session";
import { NAV_TABS } from "../lib/navTabs";
import { PermissionMatrix, roleTemplatePermissions } from "../components/PermissionMatrix";

const ROLE_LABELS: Record<StaffRole, string> = {
  offshore_intake_employee: "Offshore Intake Employee",
  travel_agent: "Travel Agent",
  supervisor_manager: "Supervisor / Manager",
  ticketing_agent: "Ticketing Agent",
  finance_user: "Finance User",
  system_administrator: "System Administrator",
};
const ASSIGNABLE_ROLES = PHASE_ONE_ROLES;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type RoleCapability = {
  purpose: string;
  can: string[];
  cannot: string[];
};

const ROLE_CAPABILITIES: Record<PhaseOneRole, RoleCapability> = {
  offshore_intake_employee: {
    purpose: "Prepares the client and request so operational travel work can begin.",
    can: [
      "Receive and record WhatsApp inquiries",
      "Find, create, and update clients",
      "Create and update traveller profiles",
      "Complete onboarding and identify missing information",
      "Prepare approved replies and route new requests",
    ],
    cannot: [
      "Own flight research or reservation-hold work",
      "Issue, change, void, exchange, or refund tickets",
      "Manage users or system configuration",
    ],
  },
  travel_agent: {
    purpose: "Owns assigned travel requests and prepares the selected option for booking.",
    can: [
      "Work with client and traveller records",
      "Manage assigned travel requests",
      "Research and prepare flight options",
      "Communicate options and follow up with clients",
      "Create reservation holds and prepare bookings for ticketing",
    ],
    cannot: [
      "Issue, change, void, exchange, or refund tickets in Phase 1",
      "Manage users or system configuration",
      "Receive operational-escalation authority unless explicitly designated later",
    ],
  },
  supervisor_manager: {
    purpose: "Works operational requests while supervising workload and reviewing completed exceptions.",
    can: [
      "Perform the same Phase 1 operational work as a Travel Agent",
      "See team workload and reassign requests",
      "Review completed markup changes and operational exceptions",
      "Review live Phase 1 workload and follow-up reports",
    ],
    cannot: [
      "Issue, change, void, exchange, or refund tickets in Phase 1",
      "Block an agent action while waiting for supervisor review",
      "Manage system configuration unless separately granted",
    ],
  },
  system_administrator: {
    purpose: "Maintains technical access, configuration, integrations, and system history.",
    can: [
      "Create users and assign approved roles",
      "Configure booking fees and workflow settings",
      "Manage system and integration settings",
      "Review access and configuration audit history",
    ],
    cannot: [
      "Receive ticketing or finance authority automatically",
      "Act as the operational supervisor automatically",
      "Issue, change, void, exchange, or refund tickets by default",
    ],
  },
};

export const Route = createFileRoute("/users")({
  // Belt-and-suspenders on top of the nav already hiding this tab for
  // non-admins — a direct URL visit still has to pass this check.
  beforeLoad: () => {
    if (!hasPermission(getStoredUser(), "users.manage")) {
      throw redirect({ to: "/" });
    }
  },
  component: UsersPage,
});

function UsersPage() {
  const params = useParams({ strict: false });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const usersQuery = useQuery({ queryKey: ["users"], queryFn: usersApi.list });
  const requestTypesQuery = useQuery({
    queryKey: ["request-workflow-settings", "active"],
    queryFn: requestWorkflowSettingsApi.listActive,
  });

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [roles, setRoles] = useState<PhaseOneRole[]>([]);
  const [permissions, setPermissions] = useState<StaffPermission[]>([]);
  const [active, setActive] = useState(true);
  const [availabilityStatus, setAvailabilityStatus] = useState<"available" | "unavailable" | "absent">("available");
  const [capacityLimit, setCapacityLimit] = useState(10);
  const [highPriorityCapacityLimit, setHighPriorityCapacityLimit] = useState(12);
  const [timezone, setTimezone] = useState("America/New_York");
  const [workdays, setWorkdays] = useState([1, 2, 3, 4, 5]);
  const [workdayStart, setWorkdayStart] = useState("08:00");
  const [workdayEnd, setWorkdayEnd] = useState("18:00");
  const [eligibleRequestTypeIds, setEligibleRequestTypeIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setShowForm(false);
      setName("");
      setEmail("");
      setPhoneNumber("");
      setPassword("");
      setRoles([]);
      setPermissions([]);
      setActive(true);
      setAvailabilityStatus("available");
      setCapacityLimit(10);
      setHighPriorityCapacityLimit(12);
      setTimezone("America/New_York");
      setWorkdays([1, 2, 3, 4, 5]);
      setWorkdayStart("08:00");
      setWorkdayEnd("18:00");
      setEligibleRequestTypeIds([]);
      setError(null);
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Failed to create user");
      // A 401 here means the token expired mid-session — clearSession()
      // already ran inside api.ts, so send them to log in again.
      if (err instanceof Error && err.message.toLowerCase().includes("expired")) {
        void navigate({ to: "/login" });
      }
    },
  });

  function toggleRole(role: PhaseOneRole) {
    setRoles((prev) => {
      const next = prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role];
      setPermissions(roleTemplatePermissions(next));
      return next;
    });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (workdayStart === workdayEnd) {
      setError("Working-day start and end times must be different");
      return;
    }
    createMutation.mutate({
      name,
      email,
      phoneNumber,
      password,
      roles,
      permissions,
      active,
      availabilityStatus,
      capacityLimit,
      highPriorityCapacityLimit,
      timezone,
      workdays,
      workdayStart,
      workdayEnd,
      eligibleRequestTypeIds,
    });
  }

  if (params.userId) return <Outlet />;

  return (
    <div className="min-h-screen min-w-[1280px] bg-yb-canvas text-yb-ink">
      <AppHeader tabs={NAV_TABS} />

      <div className="flex items-center gap-[14px] px-[22px] pt-[16px] pb-[14px]">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-yb-tile bg-yb-green">
          <div className="h-[13px] w-[13px] rounded-[1px] border-2 border-yb-gold" />
        </div>
        <div>
          <div className="text-[10.5px] font-bold tracking-[1.4px] text-yb-muted4">SETUP</div>
          <h1 className="mt-[1px] yb-page-title">Users</h1>
        </div>
        <div className="flex-1" />
        <PrimaryButton onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ New User"}
        </PrimaryButton>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mx-[22px] mb-[18px] rounded-yb border border-yb-line bg-yb-panel-head p-[16px]"
        >
          <div className="grid grid-cols-4 gap-[14px]">
            <label className="flex-1 text-[13px] text-yb-muted">
              Name
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 h-[32px] w-full rounded-yb border border-yb-line-btn bg-white px-[9px] text-[14px] text-yb-ink"
              />
            </label>
            <label className="flex-1 text-[13px] text-yb-muted">
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-[32px] w-full rounded-yb border border-yb-line-btn bg-white px-[9px] text-[14px] text-yb-ink"
              />
            </label>
            <label className="flex-1 text-[13px] text-yb-muted">
              WhatsApp phone number
              <input
                type="tel"
                required
                pattern="\+[1-9][0-9]{7,14}"
                placeholder="+251911234567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="mt-1 h-[32px] w-full rounded-yb border border-yb-line-btn bg-white px-[9px] text-[14px] text-yb-ink"
              />
              <span className="mt-[3px] block text-[10.5px] text-yb-muted3">Country code required; used for WhatsApp groups.</span>
            </label>
            <label className="flex-1 text-[13px] text-yb-muted">
              Temporary password
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 h-[32px] w-full rounded-yb border border-yb-line-btn bg-white px-[9px] text-[14px] text-yb-ink"
              />
            </label>
          </div>

          <div className="mt-[14px]">
            <div className="mb-[6px] text-[13px] text-yb-muted">
              Roles — one person may hold more than one
            </div>
            <div className="flex flex-wrap gap-[10px]">
              {ASSIGNABLE_ROLES.map((role) => (
                <label
                  key={role}
                  className="flex items-center gap-[6px] rounded-yb border border-yb-line-btn bg-white px-[10px] py-[6px] text-[13px] text-yb-ink"
                >
                  <input
                    type="checkbox"
                    checked={roles.includes(role)}
                    onChange={() => toggleRole(role)}
                  />
                  {ROLE_LABELS[role]}
                </label>
              ))}
            </div>
            {roles.length === 0 ? (
              <div className="mt-[10px] border border-yb-line-soft bg-white px-[12px] py-[10px] text-[12.5px] text-yb-muted3">
                Select a role to review exactly what it permits and restricts.
              </div>
            ) : (
              <div className={`mt-[10px] grid gap-[10px] ${roles.length === 1 ? "grid-cols-1" : roles.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                {roles.map((role) => {
                  const capability = ROLE_CAPABILITIES[role];
                  return (
                    <section key={role} className="yb-card border border-yb-line bg-white">
                      <div className="border-b border-yb-line bg-yb-table-head px-[11px] py-[8px]">
                        <div className="text-[13.5px] font-black text-yb-ink">{ROLE_LABELS[role]}</div>
                        <div className="mt-[2px] text-[11.5px] leading-[16px] text-yb-muted3">{capability.purpose}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-[12px] px-[11px] py-[10px]">
                        <div>
                          <div className="mb-[5px] text-[10.5px] font-bold tracking-[0.8px] text-yb-green">CAN</div>
                          {capability.can.map((item) => <div key={item} className="mb-[4px] flex gap-[6px] text-[12px] leading-[16px] text-yb-ink2"><span className="font-bold text-yb-green">✓</span><span>{item}</span></div>)}
                        </div>
                        <div>
                          <div className="mb-[5px] text-[10.5px] font-bold tracking-[0.8px] text-yb-red">NOT INCLUDED IN THIS ROLE</div>
                          {capability.cannot.map((item) => <div key={item} className="mb-[4px] flex gap-[6px] text-[12px] leading-[16px] text-yb-ink2"><span className="font-bold text-yb-red">×</span><span>{item}</span></div>)}
                        </div>
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
            {roles.length > 1 && (
              <div className="mt-[8px] text-[11.5px] text-yb-muted3">
                This employee receives the combined permitted capabilities of the selected roles. A role never removes the restrictions of another role or grants high-risk ticketing or finance authority.
              </div>
            )}
          </div>

          <div className="mt-[14px]">
            <PermissionMatrix permissions={permissions} onChange={setPermissions} />
          </div>

          <section className="yb-card mt-[14px] border border-yb-line bg-white">
            <div className="border-b border-yb-line bg-yb-table-head px-[12px] py-[8px]">
              <div className="text-[11px] font-bold tracking-[1px] text-yb-panel-head-text">AVAILABILITY &amp; CAPACITY</div>
              <div className="mt-[2px] text-[11px] text-yb-muted3">These values are used immediately by request assignment and fallback routing.</div>
            </div>
            <div className="grid grid-cols-4 gap-[12px] px-[12px] py-[11px]">
              <label className="text-[12px] text-yb-muted">Account status
                <select value={active ? "active" : "inactive"} onChange={(event) => setActive(event.target.value === "active")} className="mt-1 h-[32px] w-full border border-yb-line-btn bg-white px-[8px] text-yb-ink">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label className="text-[12px] text-yb-muted">Current availability
                <select value={availabilityStatus} onChange={(event) => setAvailabilityStatus(event.target.value as typeof availabilityStatus)} className="mt-1 h-[32px] w-full border border-yb-line-btn bg-white px-[8px] text-yb-ink">
                  <option value="available">Available</option>
                  <option value="unavailable">Unavailable</option>
                  <option value="absent">Absent</option>
                </select>
              </label>
              <label className="text-[12px] text-yb-muted">Standard request capacity
                <input aria-label="Standard request capacity" type="number" min={1} max={500} value={capacityLimit} onChange={(event) => setCapacityLimit(Number(event.target.value))} className="mt-1 h-[32px] w-full border border-yb-line-btn px-[8px] text-yb-ink" />
              </label>
              <label className="text-[12px] text-yb-muted">High / urgent capacity
                <input aria-label="High priority request capacity" type="number" min={1} max={500} value={highPriorityCapacityLimit} onChange={(event) => setHighPriorityCapacityLimit(Number(event.target.value))} className="mt-1 h-[32px] w-full border border-yb-line-btn px-[8px] text-yb-ink" />
              </label>
            </div>
            <div className="grid grid-cols-[1.3fr_0.7fr_0.7fr_2fr] gap-[12px] border-t border-yb-line-soft px-[12px] py-[11px]">
              <label className="text-[12px] text-yb-muted">Working timezone
                <input required value={timezone} onChange={(event) => setTimezone(event.target.value)} placeholder="America/New_York" className="mt-1 h-[32px] w-full border border-yb-line-btn px-[8px] text-yb-ink" />
              </label>
              <label className="text-[12px] text-yb-muted">Starts
                <input type="time" required value={workdayStart} onChange={(event) => setWorkdayStart(event.target.value)} className="mt-1 h-[32px] w-full border border-yb-line-btn px-[8px] text-yb-ink" />
              </label>
              <label className="text-[12px] text-yb-muted">Ends
                <input type="time" required value={workdayEnd} onChange={(event) => setWorkdayEnd(event.target.value)} className="mt-1 h-[32px] w-full border border-yb-line-btn px-[8px] text-yb-ink" />
              </label>
              <div className="text-[12px] text-yb-muted">Working days
                <div className="mt-[7px] flex flex-wrap gap-x-[10px] gap-y-[5px]">
                  {DAYS.map((day, index) => <label key={day} className="flex items-center gap-[4px] text-[11.5px] text-yb-ink"><input type="checkbox" checked={workdays.includes(index)} onChange={(event) => setWorkdays((current) => event.target.checked ? [...current, index].sort() : current.filter((value) => value !== index))} />{day}</label>)}
                </div>
              </div>
            </div>
            <div className="border-t border-yb-line-soft px-[12px] py-[11px]">
              <div className="text-[12px] text-yb-muted">Qualified request types</div>
              <div className="mt-[6px] flex flex-wrap gap-[8px]">
                {(requestTypesQuery.data?.requestTypes ?? []).map((requestType) => <label key={requestType.id} className="flex items-center gap-[5px] border border-yb-line-soft bg-yb-toolbar px-[8px] py-[5px] text-[11.5px] text-yb-ink"><input type="checkbox" checked={eligibleRequestTypeIds.includes(requestType.id)} onChange={(event) => setEligibleRequestTypeIds((current) => event.target.checked ? [...current, requestType.id] : current.filter((id) => id !== requestType.id))} />{requestType.name}</label>)}
                {requestTypesQuery.isLoading && <span className="text-[11.5px] text-yb-muted3">Loading request types…</span>}
              </div>
              <div className="mt-[5px] text-[10.5px] text-yb-muted3">Leave all unchecked when the employee may handle every active request type.</div>
            </div>
          </section>

          {error && <div className="mt-[10px] text-[13px] text-yb-red">{error}</div>}

          <div className="mt-[14px] flex gap-[10px]">
            <PrimaryButton type="submit" disabled={createMutation.isPending || roles.length === 0 || workdays.length === 0}>
              {createMutation.isPending ? "Creating…" : "Create Employee"}
            </PrimaryButton>
            <SecondaryButton type="button" onClick={() => setShowForm(false)}>
              Cancel
            </SecondaryButton>
          </div>
        </form>
      )}

      <div className="mx-[22px] mb-[26px] rounded-yb border border-yb-line bg-white">
        <div className="flex items-center border-b border-yb-line bg-yb-panel-head px-[14px] py-2">
          <div className="text-[11.5px] font-bold tracking-[1.1px] text-yb-panel-head-text">
            EMPLOYEES
          </div>
          <div className="flex-1" />
          <div className="text-[11.5px] text-yb-muted3">{usersQuery.data?.length ?? 0} items</div>
        </div>

        <table className="w-full table-fixed border-collapse text-[14px]">
          <thead>
            <tr className="bg-yb-table-head">
              <th className="w-[190px] border-b border-yb-line py-[7px] pr-2 pl-[14px] text-left font-bold text-yb-muted">
                Employee
              </th>
              <th className="w-[220px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">
                Email
              </th>
              <th className="w-[150px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">
                Phone
              </th>
              <th className="w-[240px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">
                Roles
              </th>
              <th className="w-[105px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">Availability</th>
              <th className="w-[125px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">Capacity</th>
              <th className="w-[95px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">Account</th>
              <th className="w-[90px] border-b border-yb-line py-[7px] pr-[14px] pl-2 text-right font-bold text-yb-muted">
                Details
              </th>
            </tr>
          </thead>
          <tbody>
            {(usersQuery.data ?? []).map((u) => (
              <tr key={u.id} className="bg-white">
                <td className="border-b border-yb-line-row py-[11px] pr-2 pl-[14px] font-bold">
                  <Link to="/users/$userId" params={{ userId: String(u.id) }} className="text-yb-green underline decoration-yb-green/40 underline-offset-2 hover:decoration-yb-green">{u.name}</Link>
                </td>
                <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">
                  {u.email}
                </td>
                <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">
                  {u.phoneNumber ?? <span className="text-yb-muted3">Not provided</span>}
                </td>
                <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">
                  {u.roles.map((r) => ROLE_LABELS[r]).join(", ")}
                </td>
                <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">
                  <span className={`inline-flex border px-[7px] py-[3px] text-[11px] font-bold ${u.availabilityStatus === "available" ? "border-yb-green/30 bg-yb-success text-yb-green" : "border-yb-line bg-yb-toolbar text-yb-muted3"}`}>{u.availabilityStatus.charAt(0).toUpperCase() + u.availabilityStatus.slice(1)}</span>
                </td>
                <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">
                  <div className="font-bold">{u.openRequestCount} / {u.capacityLimit}</div>
                  <div className="text-[10.5px] text-yb-muted3">High {u.highPriorityCapacityLimit}</div>
                </td>
                <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">
                  {u.active ? <span className="font-bold text-yb-green">Active</span> : <span className="font-bold text-yb-red">Inactive</span>}
                </td>
                <td className="border-b border-yb-line-row py-[11px] pr-[14px] pl-2 text-right text-yb-muted3">
                  <Link to="/users/$userId" params={{ userId: String(u.id) }} className="font-bold text-yb-green underline">Open</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {usersQuery.isLoading && (
          <div className="px-[14px] py-[28px] text-center text-[14px] text-yb-muted3">
            Loading users…
          </div>
        )}
        {usersQuery.isError && (
          <div className="px-[14px] py-[28px] text-center text-[14px] text-yb-red">
            Couldn&rsquo;t load users.
          </div>
        )}
      </div>
    </div>
  );
}
