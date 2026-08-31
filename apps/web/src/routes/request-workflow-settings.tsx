import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AppHeader } from "../components/AppShell/AppHeader";
import { PrimaryButton, SecondaryButton } from "../components/AppShell/buttons";
import { requestWorkflowSettingsApi, type RequestSetting, type RequestSettingInput, type UrgencyLevel, type UrgencyLevelInput } from "../lib/api";
import { NAV_TABS } from "../lib/navTabs";
import { getStoredUser, hasAdminRole } from "../lib/session";

export const Route = createFileRoute("/request-workflow-settings")({
  beforeLoad: () => { if (!hasAdminRole(getStoredUser())) throw redirect({ to: "/" }); },
  component: RequestWorkflowSettingsPage,
});

type Kind = "type" | "status";
const EMPTY: RequestSettingInput = { code: "", name: "", description: "", position: 10, active: true };
const EMPTY_URGENCY: UrgencyLevelInput = { ...EMPTY, responseDeadlineMinutes: null, serviceDeadlineMinutes: null };
const inputClass = "mt-1 h-[32px] w-full rounded-yb border border-yb-line-btn bg-white px-[9px] text-[14px] text-yb-ink";

function RequestWorkflowSettingsPage() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({ queryKey: ["request-workflow-settings", "admin"], queryFn: requestWorkflowSettingsApi.listAll });
  const [kind, setKind] = useState<Kind | null>(null);
  const [editing, setEditing] = useState<RequestSetting | null>(null);
  const [form, setForm] = useState<RequestSettingInput>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [urgencyFormOpen, setUrgencyFormOpen] = useState(false);
  const [editingUrgency, setEditingUrgency] = useState<UrgencyLevel | null>(null);
  const [urgencyForm, setUrgencyForm] = useState<UrgencyLevelInput>(EMPTY_URGENCY);
  const [urgencyError, setUrgencyError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: async (input: RequestSettingInput) => {
      if (kind === "type") return editing ? requestWorkflowSettingsApi.updateType(editing.id, input) : requestWorkflowSettingsApi.createType(input);
      if (kind === "status") return editing ? requestWorkflowSettingsApi.updateStatus(editing.id, input) : requestWorkflowSettingsApi.createStatus(input);
      throw new Error("Select a catalogue");
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["request-workflow-settings"] }); closeForm(); },
    onError: (err: unknown) => setError(err instanceof Error ? err.message : "Failed to save setting"),
  });
  const urgencyMutation = useMutation({
    mutationFn: (input: UrgencyLevelInput) => editingUrgency
      ? requestWorkflowSettingsApi.updateUrgency(editingUrgency.id, input)
      : requestWorkflowSettingsApi.createUrgency(input),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["request-workflow-settings"] }); closeUrgencyForm(); },
    onError: (err: unknown) => setUrgencyError(err instanceof Error ? err.message : "Failed to save urgency level"),
  });

  function openNew(nextKind: Kind, count: number) {
    setKind(nextKind); setEditing(null); setForm({ ...EMPTY, position: (count + 1) * 10 }); setError(null);
  }
  function openEdit(nextKind: Kind, item: RequestSetting) {
    setKind(nextKind); setEditing(item); setForm({ code: item.code, name: item.name, description: item.description, position: item.position, active: item.active }); setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function closeForm() { setKind(null); setEditing(null); setForm(EMPTY); setError(null); }
  function setField<K extends keyof RequestSettingInput>(key: K, value: RequestSettingInput[K]) { setForm((current) => ({ ...current, [key]: value })); }
  function submit(event: FormEvent) { event.preventDefault(); setError(null); saveMutation.mutate(form); }
  function openNewUrgency(count: number) {
    closeForm(); setEditingUrgency(null); setUrgencyForm({ ...EMPTY_URGENCY, position: (count + 1) * 10 }); setUrgencyFormOpen(true); setUrgencyError(null);
  }
  function openEditUrgency(item: UrgencyLevel) {
    closeForm(); setEditingUrgency(item); setUrgencyForm({ code: item.code, name: item.name, description: item.description, position: item.position, active: item.active, responseDeadlineMinutes: item.responseDeadlineMinutes, serviceDeadlineMinutes: item.serviceDeadlineMinutes }); setUrgencyFormOpen(true); setUrgencyError(null); window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function closeUrgencyForm() { setUrgencyFormOpen(false); setEditingUrgency(null); setUrgencyForm(EMPTY_URGENCY); setUrgencyError(null); }
  function setUrgencyField<K extends keyof UrgencyLevelInput>(key: K, value: UrgencyLevelInput[K]) { setUrgencyForm((current) => ({ ...current, [key]: value })); }
  function submitUrgency(event: FormEvent) { event.preventDefault(); setUrgencyError(null); urgencyMutation.mutate(urgencyForm); }

  const types = settingsQuery.data?.requestTypes ?? [];
  const statuses = settingsQuery.data?.requestStatuses ?? [];
  const urgencies = settingsQuery.data?.urgencyLevels ?? [];
  return (
    <div className="min-w-[1280px] bg-white text-yb-ink">
      <AppHeader tabs={NAV_TABS} />
      <div className="flex items-center gap-[14px] px-[22px] pt-[16px] pb-[14px]">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-yb-tile bg-yb-green"><div className="h-[13px] w-[13px] rounded-[1px] border-2 border-yb-gold" /></div>
        <div><div className="text-[10.5px] font-bold tracking-[1.4px] text-yb-muted4">SETUP</div><h1 className="mt-[1px] text-[26px] font-black">Request Workflow</h1><p className="mt-[3px] text-[13px] text-yb-muted3">Manage request types, statuses, urgency levels, and their response and service deadlines.</p></div>
      </div>

      {urgencyFormOpen && <form onSubmit={submitUrgency} className="mx-[22px] mb-[16px] border border-yb-line bg-yb-panel-head p-[14px]">
        <div className="mb-[4px] text-[15px] font-black">{editingUrgency ? "Edit" : "New"} urgency level</div>
        <div className="mb-[10px] text-[12px] text-yb-muted3">Deadlines use elapsed clock minutes from request receipt. Leave blank until YB Travel approves the target.</div>
        <div className="grid grid-cols-[1fr_1fr_2fr_100px_160px_160px] gap-[12px]">
          <label className="text-[13px] text-yb-muted">Name<input required maxLength={100} value={urgencyForm.name} onChange={(e) => setUrgencyField("name", e.target.value)} className={inputClass} /></label>
          <label className="text-[13px] text-yb-muted">Stable code<input required readOnly={editingUrgency !== null} maxLength={60} value={urgencyForm.code} onChange={(e) => setUrgencyField("code", e.target.value.toLowerCase().replace(/\s+/g, "_"))} className={`${inputClass} ${editingUrgency ? "bg-yb-toolbar text-yb-muted3" : ""}`} /></label>
          <label className="text-[13px] text-yb-muted">Description<input maxLength={300} value={urgencyForm.description} onChange={(e) => setUrgencyField("description", e.target.value)} className={inputClass} /></label>
          <label className="text-[13px] text-yb-muted">Order<input required type="number" min="0" max="10000" value={urgencyForm.position} onChange={(e) => setUrgencyField("position", Number(e.target.value))} className={inputClass} /></label>
          <label className="text-[13px] text-yb-muted">Response deadline<input type="number" min="1" max="5256000" value={urgencyForm.responseDeadlineMinutes ?? ""} onChange={(e) => setUrgencyField("responseDeadlineMinutes", e.target.value ? Number(e.target.value) : null)} placeholder="Minutes" className={inputClass} /></label>
          <label className="text-[13px] text-yb-muted">Service deadline<input type="number" min="1" max="5256000" value={urgencyForm.serviceDeadlineMinutes ?? ""} onChange={(e) => setUrgencyField("serviceDeadlineMinutes", e.target.value ? Number(e.target.value) : null)} placeholder="Minutes" className={inputClass} /></label>
        </div>
        <label className="mt-[10px] flex items-center gap-[6px] text-[13px]"><input type="checkbox" checked={urgencyForm.active} onChange={(e) => setUrgencyField("active", e.target.checked)} /> Active</label>
        {urgencyError && <div className="mt-[8px] text-[13px] text-yb-red">{urgencyError}</div>}
        <div className="mt-[12px] flex gap-[8px]"><PrimaryButton type="submit" disabled={urgencyMutation.isPending}>{urgencyMutation.isPending ? "Saving…" : "Save"}</PrimaryButton><SecondaryButton type="button" onClick={closeUrgencyForm}>Cancel</SecondaryButton></div>
      </form>}

      {kind && <form onSubmit={submit} className="mx-[22px] mb-[16px] border border-yb-line bg-yb-panel-head p-[14px]">
        <div className="mb-[10px] text-[15px] font-black">{editing ? "Edit" : "New"} request {kind}</div>
        <div className="grid grid-cols-[1fr_1fr_2fr_110px] gap-[12px]">
          <label className="text-[13px] text-yb-muted">Name<input required maxLength={100} value={form.name} onChange={(e) => setField("name", e.target.value)} className={inputClass} /></label>
          <label className="text-[13px] text-yb-muted">Stable code<input required readOnly={editing !== null} maxLength={60} value={form.code} onChange={(e) => setField("code", e.target.value.toLowerCase().replace(/\s+/g, "_"))} className={`${inputClass} ${editing ? "bg-yb-toolbar text-yb-muted3" : ""}`} /></label>
          <label className="text-[13px] text-yb-muted">Description<input maxLength={300} value={form.description} onChange={(e) => setField("description", e.target.value)} className={inputClass} /></label>
          <label className="text-[13px] text-yb-muted">Order<input required type="number" min="0" max="10000" value={form.position} onChange={(e) => setField("position", Number(e.target.value))} className={inputClass} /></label>
        </div>
        {editing && <div className="mt-[6px] text-[11.5px] text-yb-muted3">Stable codes are read-only because request records and integrations use them as identifiers.</div>}
        <label className="mt-[10px] flex items-center gap-[6px] text-[13px]"><input type="checkbox" checked={form.active} onChange={(e) => setField("active", e.target.checked)} /> Active</label>
        {error && <div className="mt-[8px] text-[13px] text-yb-red">{error}</div>}
        <div className="mt-[12px] flex gap-[8px]"><PrimaryButton type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving…" : "Save"}</PrimaryButton><SecondaryButton type="button" onClick={closeForm}>Cancel</SecondaryButton></div>
      </form>}

      <div className="mx-[22px] mb-[26px] grid grid-cols-2 gap-[14px]">
        <Catalogue title="REQUEST TYPES" items={types} onNew={() => openNew("type", types.length)} onEdit={(item) => openEdit("type", item)} />
        <Catalogue title="REQUEST STATUSES" items={statuses} onNew={() => openNew("status", statuses.length)} onEdit={(item) => openEdit("status", item)} />
        <UrgencyCatalogue items={urgencies} onNew={() => openNewUrgency(urgencies.length)} onEdit={openEditUrgency} />
      </div>
    </div>
  );
}

function formatMinutes(value: number | null): string {
  if (value === null) return "Not set";
  if (value % 1440 === 0) return `${value / 1440} day${value === 1440 ? "" : "s"}`;
  if (value % 60 === 0) return `${value / 60} hour${value === 60 ? "" : "s"}`;
  return `${value} minutes`;
}

function UrgencyCatalogue({ items, onNew, onEdit }: { items: UrgencyLevel[]; onNew: () => void; onEdit: (item: UrgencyLevel) => void }) {
  return <div className="col-span-2 border border-yb-line bg-white">
    <div className="flex items-center border-b border-yb-line bg-yb-panel-head px-[12px] py-[8px]"><div><div className="text-[11.5px] font-bold tracking-[1px] text-yb-panel-head-text">URGENCY LEVELS & DEADLINES</div><div className="mt-[2px] text-[11.5px] text-yb-muted3">Due timestamps are saved on each request for future on-time and overdue reporting.</div></div><div className="flex-1" /><PrimaryButton onClick={onNew}>+ New</PrimaryButton></div>
    <table className="w-full border-collapse text-[13px]"><thead><tr className="bg-yb-table-head text-left text-yb-muted"><th className="px-[10px] py-[7px]">Order</th><th className="px-[10px] py-[7px]">Urgency</th><th className="px-[10px] py-[7px]">Response deadline</th><th className="px-[10px] py-[7px]">Service deadline</th><th className="px-[10px] py-[7px]">Status</th><th className="px-[10px] py-[7px] text-right">Action</th></tr></thead><tbody>
      {items.map((item) => <tr key={item.id}><td className="border-b border-yb-line-row px-[10px] py-[9px]">{item.position}</td><td className="border-b border-yb-line-row px-[10px] py-[9px]"><div className="font-bold">{item.name}</div><div className="font-mono text-[10.5px] text-yb-muted4">{item.code}</div><div className="mt-[2px] text-[11.5px] text-yb-muted3">{item.description}</div></td><td className="border-b border-yb-line-row px-[10px] py-[9px] font-bold">{formatMinutes(item.responseDeadlineMinutes)}</td><td className="border-b border-yb-line-row px-[10px] py-[9px] font-bold">{formatMinutes(item.serviceDeadlineMinutes)}</td><td className="border-b border-yb-line-row px-[10px] py-[9px] font-bold"><span className={item.active ? "text-yb-green" : "text-yb-muted4"}>{item.active ? "Active" : "Inactive"}</span></td><td className="border-b border-yb-line-row px-[10px] py-[9px] text-right"><button type="button" onClick={() => onEdit(item)} className="text-yb-green underline">Edit</button></td></tr>)}
    </tbody></table>
  </div>;
}

function Catalogue({ title, items, onNew, onEdit }: { title: string; items: RequestSetting[]; onNew: () => void; onEdit: (item: RequestSetting) => void }) {
  return <div className="border border-yb-line bg-white">
    <div className="flex items-center border-b border-yb-line bg-yb-panel-head px-[12px] py-[8px]"><div className="text-[11.5px] font-bold tracking-[1px] text-yb-panel-head-text">{title}</div><div className="flex-1" /><PrimaryButton onClick={onNew}>+ New</PrimaryButton></div>
    <table className="w-full border-collapse text-[13px]"><thead><tr className="bg-yb-table-head text-left text-yb-muted"><th className="px-[10px] py-[7px]">Order</th><th className="px-[10px] py-[7px]">Name</th><th className="px-[10px] py-[7px]">Status</th><th className="px-[10px] py-[7px] text-right">Action</th></tr></thead><tbody>
      {items.map((item) => <tr key={item.id}><td className="border-b border-yb-line-row px-[10px] py-[9px]">{item.position}</td><td className="border-b border-yb-line-row px-[10px] py-[9px]"><div className="font-bold">{item.name}</div><div className="font-mono text-[10.5px] text-yb-muted4">{item.code}</div><div className="mt-[2px] text-[11.5px] text-yb-muted3">{item.description}</div></td><td className="border-b border-yb-line-row px-[10px] py-[9px] font-bold"><span className={item.active ? "text-yb-green" : "text-yb-muted4"}>{item.active ? "Active" : "Inactive"}</span></td><td className="border-b border-yb-line-row px-[10px] py-[9px] text-right"><button type="button" onClick={() => onEdit(item)} className="text-yb-green underline">Edit</button></td></tr>)}
    </tbody></table>
  </div>;
}
