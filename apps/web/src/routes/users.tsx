import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { PHASE_ONE_ROLES, type PhaseOneRole, type StaffRole } from "@yb-travel/shared";
import { AppHeader } from "../components/AppShell/AppHeader";
import { PrimaryButton, SecondaryButton } from "../components/AppShell/buttons";
import { usersApi } from "../lib/api";
import { getStoredUser, hasAdminRole } from "../lib/session";
import { NAV_TABS } from "../lib/navTabs";

const ROLE_LABELS: Record<StaffRole, string> = {
  offshore_intake_employee: "Offshore Intake Employee",
  travel_agent: "Travel Agent",
  supervisor_manager: "Supervisor / Manager",
  ticketing_agent: "Ticketing Agent",
  finance_user: "Finance User",
  system_administrator: "System Administrator",
};
const ASSIGNABLE_ROLES = PHASE_ONE_ROLES;

export const Route = createFileRoute("/users")({
  // Belt-and-suspenders on top of the nav already hiding this tab for
  // non-admins — a direct URL visit still has to pass this check.
  beforeLoad: () => {
    if (!hasAdminRole(getStoredUser())) {
      throw redirect({ to: "/" });
    }
  },
  component: UsersPage,
});

function UsersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const usersQuery = useQuery({ queryKey: ["users"], queryFn: usersApi.list });

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roles, setRoles] = useState<PhaseOneRole[]>([]);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setShowForm(false);
      setName("");
      setEmail("");
      setPassword("");
      setRoles([]);
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
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    createMutation.mutate({ name, email, password, roles });
  }

  return (
    <div className="min-w-[1280px] bg-white text-yb-ink">
      <AppHeader tabs={NAV_TABS} />

      <div className="flex items-center gap-[14px] px-[22px] pt-[16px] pb-[14px]">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-yb-tile bg-yb-green">
          <div className="h-[13px] w-[13px] rounded-[1px] border-2 border-yb-gold" />
        </div>
        <div>
          <div className="text-[10.5px] font-bold tracking-[1.4px] text-yb-muted4">SETUP</div>
          <h1 className="mt-[1px] text-[26px] font-black tracking-[-0.2px]">Users</h1>
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
          <div className="flex gap-[14px]">
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
          </div>

          {error && <div className="mt-[10px] text-[13px] text-yb-red">{error}</div>}

          <div className="mt-[14px] flex gap-[10px]">
            <PrimaryButton type="submit" disabled={createMutation.isPending || roles.length === 0}>
              {createMutation.isPending ? "Creating…" : "Create User"}
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
            USERS
          </div>
          <div className="flex-1" />
          <div className="text-[11.5px] text-yb-muted3">{usersQuery.data?.length ?? 0} items</div>
        </div>

        <table className="w-full table-fixed border-collapse text-[14px]">
          <thead>
            <tr className="bg-yb-table-head">
              <th className="w-[200px] border-b border-yb-line py-[7px] pr-2 pl-[14px] text-left font-bold text-yb-muted">
                Name
              </th>
              <th className="w-[260px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">
                Email
              </th>
              <th className="border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">
                Roles
              </th>
              <th className="w-[130px] border-b border-yb-line py-[7px] pr-[14px] pl-2 text-right font-bold text-yb-muted">
                Created
              </th>
            </tr>
          </thead>
          <tbody>
            {(usersQuery.data ?? []).map((u) => (
              <tr key={u.id} className="bg-white">
                <td className="border-b border-yb-line-row py-[11px] pr-2 pl-[14px] font-bold">
                  {u.name}
                </td>
                <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">
                  {u.email}
                </td>
                <td className="border-b border-yb-line-row px-2 py-[11px] text-yb-ink2">
                  {u.roles.map((r) => ROLE_LABELS[r]).join(", ")}
                </td>
                <td className="border-b border-yb-line-row py-[11px] pr-[14px] pl-2 text-right text-yb-muted3">
                  {new Date(u.createdAt).toLocaleDateString()}
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
