import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AppHeader } from "../components/AppShell/AppHeader";
import { PrimaryButton, SecondaryButton } from "../components/AppShell/buttons";
import {
  workflowSettingsApi,
  type OnboardingStageInput,
  type OnboardingStageSetting,
  type RequiredInformationField,
  type RequiredInformationFieldInput,
  type RequirementEntity,
  type SetupRole,
  type TaskPriority,
} from "../lib/api";
import { NAV_TABS } from "../lib/navTabs";
import { getStoredUser, hasAdminRole } from "../lib/session";

export const Route = createFileRoute("/onboarding-settings")({
  beforeLoad: () => {
    if (!hasAdminRole(getStoredUser())) throw redirect({ to: "/" });
  },
  component: OnboardingSettingsPage,
});

const inputClass =
  "mt-1 h-[32px] w-full rounded-yb border border-yb-line-btn bg-white px-[9px] text-[14px] text-yb-ink";

const ROLE_LABELS: Record<SetupRole, string> = {
  offshore_intake_employee: "Offshore Intake Employee",
  travel_agent: "Travel Agent",
  system_administrator: "System Administrator",
};

const ENTITY_LABELS: Record<RequirementEntity, string> = {
  client: "Client",
  traveller: "Traveller",
  request: "Travel request",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

const EMPTY_STAGE: OnboardingStageInput = {
  code: "",
  name: "",
  description: "",
  position: 10,
  active: true,
  completionStage: false,
  blocksCompletionUntilReviewed: false,
  generatesTask: false,
  responsibleRole: null,
  taskPriority: "normal",
  expectedDurationMinutes: null,
};

const EMPTY_FIELD: RequiredInformationFieldInput = {
  entityType: "traveller",
  fieldKey: "",
  label: "",
  required: true,
  requiresReview: true,
  position: 10,
  active: true,
};

function formatDuration(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 60) return `${minutes} min`;
  if (minutes % 60 === 0) return `${minutes / 60} hr${minutes === 60 ? "" : "s"}`;
  return `${Math.floor(minutes / 60)} hr ${minutes % 60} min`;
}

function OnboardingSettingsPage() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ["workflow-settings", "admin"],
    queryFn: workflowSettingsApi.listAll,
  });

  const [stageFormOpen, setStageFormOpen] = useState(false);
  const [editingStageId, setEditingStageId] = useState<number | null>(null);
  const [stageForm, setStageForm] = useState<OnboardingStageInput>(EMPTY_STAGE);
  const [stageError, setStageError] = useState<string | null>(null);

  const [fieldFormOpen, setFieldFormOpen] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<number | null>(null);
  const [fieldForm, setFieldForm] = useState<RequiredInformationFieldInput>(EMPTY_FIELD);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const stageMutation = useMutation({
    mutationFn: ({ id, input }: { id: number | null; input: OnboardingStageInput }) =>
      id === null ? workflowSettingsApi.createStage(input) : workflowSettingsApi.updateStage(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["workflow-settings"] });
      closeStageForm();
    },
    onError: (error: unknown) => {
      setStageError(error instanceof Error ? error.message : "Failed to save onboarding stage");
    },
  });

  const fieldMutation = useMutation({
    mutationFn: ({ id, input }: { id: number | null; input: RequiredInformationFieldInput }) =>
      id === null
        ? workflowSettingsApi.createRequiredField(input)
        : workflowSettingsApi.updateRequiredField(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["workflow-settings"] });
      closeFieldForm();
    },
    onError: (error: unknown) => {
      setFieldError(error instanceof Error ? error.message : "Failed to save required field");
    },
  });

  function setStageValue<K extends keyof OnboardingStageInput>(key: K, value: OnboardingStageInput[K]) {
    setStageForm((current) => ({ ...current, [key]: value }));
  }

  function setFieldValue<K extends keyof RequiredInformationFieldInput>(
    key: K,
    value: RequiredInformationFieldInput[K],
  ) {
    setFieldForm((current) => ({ ...current, [key]: value }));
  }

  function openNewStage() {
    const stages = settingsQuery.data?.stages ?? [];
    const nextPosition = stages.length === 0 ? 10 : Math.max(...stages.map((stage) => stage.position)) + 10;
    setEditingStageId(null);
    setStageForm({ ...EMPTY_STAGE, position: nextPosition });
    setStageFormOpen(true);
    setStageError(null);
  }

  function openEditStage(stage: OnboardingStageSetting) {
    setEditingStageId(stage.id);
    setStageForm({
      code: stage.code,
      name: stage.name,
      description: stage.description,
      position: stage.position,
      active: stage.active,
      completionStage: stage.completionStage,
      blocksCompletionUntilReviewed: stage.blocksCompletionUntilReviewed,
      generatesTask: stage.generatesTask,
      responsibleRole: stage.responsibleRole,
      taskPriority: stage.taskPriority,
      expectedDurationMinutes: stage.expectedDurationMinutes,
    });
    setStageFormOpen(true);
    setStageError(null);
  }

  function closeStageForm() {
    setStageFormOpen(false);
    setEditingStageId(null);
    setStageForm(EMPTY_STAGE);
    setStageError(null);
  }

  function openNewField() {
    const fields = settingsQuery.data?.requiredFields ?? [];
    const nextPosition = fields.length === 0 ? 10 : Math.max(...fields.map((field) => field.position)) + 10;
    setEditingFieldId(null);
    setFieldForm({ ...EMPTY_FIELD, position: nextPosition });
    setFieldFormOpen(true);
    setFieldError(null);
  }

  function openEditField(field: RequiredInformationField) {
    setEditingFieldId(field.id);
    setFieldForm({
      entityType: field.entityType,
      fieldKey: field.fieldKey,
      label: field.label,
      required: field.required,
      requiresReview: field.requiresReview,
      position: field.position,
      active: field.active,
    });
    setFieldFormOpen(true);
    setFieldError(null);
  }

  function closeFieldForm() {
    setFieldFormOpen(false);
    setEditingFieldId(null);
    setFieldForm(EMPTY_FIELD);
    setFieldError(null);
  }

  function submitStage(event: FormEvent) {
    event.preventDefault();
    setStageError(null);
    stageMutation.mutate({ id: editingStageId, input: stageForm });
  }

  function submitField(event: FormEvent) {
    event.preventDefault();
    setFieldError(null);
    fieldMutation.mutate({ id: editingFieldId, input: fieldForm });
  }

  const stages = settingsQuery.data?.stages ?? [];
  const requiredFields = settingsQuery.data?.requiredFields ?? [];
  const completionStage = stages.find((stage) => stage.completionStage);

  return (
    <div className="min-w-[1280px] bg-white text-yb-ink">
      <AppHeader tabs={NAV_TABS} />

      <div className="flex items-center gap-[14px] px-[22px] pt-[16px] pb-[14px]">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-yb-tile bg-yb-green">
          <div className="h-[13px] w-[13px] rounded-[1px] border-2 border-yb-gold" />
        </div>
        <div>
          <div className="text-[10.5px] font-bold tracking-[1.4px] text-yb-muted4">SETUP</div>
          <h1 className="mt-[1px] text-[26px] font-black tracking-[-0.2px]">Onboarding & Required Information</h1>
          <p className="mt-[3px] text-[13px] text-yb-muted3">
            Configure the onboarding path, milestone tasks, missing-information rules, and completion gate.
          </p>
        </div>
      </div>

      <div className="mx-[22px] mb-[16px] grid grid-cols-3 gap-[10px]">
        <div className="border border-yb-line bg-yb-panel-head px-[14px] py-[10px]">
          <div className="text-[10.5px] font-bold tracking-[1px] text-yb-muted4">ACTIVE STAGES</div>
          <div className="mt-[2px] text-[22px] font-black">{stages.filter((stage) => stage.active).length}</div>
        </div>
        <div className="border border-yb-line bg-yb-panel-head px-[14px] py-[10px]">
          <div className="text-[10.5px] font-bold tracking-[1px] text-yb-muted4">COMPLETION STAGE</div>
          <div className="mt-[4px] text-[15px] font-black">{completionStage?.name ?? "Not configured"}</div>
        </div>
        <div className="border border-yb-line bg-yb-panel-head px-[14px] py-[10px]">
          <div className="text-[10.5px] font-bold tracking-[1px] text-yb-muted4">REQUIRED & REVIEWED</div>
          <div className="mt-[2px] text-[22px] font-black">
            {requiredFields.filter((field) => field.active && field.required && field.requiresReview).length}
          </div>
        </div>
      </div>

      <section className="mx-[22px] mb-[20px] border border-yb-line bg-white">
        <div className="flex items-center border-b border-yb-line bg-yb-panel-head px-[14px] py-[9px]">
          <div>
            <div className="text-[11.5px] font-bold tracking-[1.1px] text-yb-panel-head-text">ONBOARDING WORKFLOW</div>
            <div className="mt-[2px] text-[12px] text-yb-muted3">Lower order numbers appear first. Only one stage can be the completion stage.</div>
          </div>
          <div className="flex-1" />
          <PrimaryButton onClick={stageFormOpen ? closeStageForm : openNewStage}>
            {stageFormOpen ? "Cancel" : "+ New Stage"}
          </PrimaryButton>
        </div>

        {stageFormOpen && (
          <form onSubmit={submitStage} className="border-b border-yb-line bg-yb-toolbar p-[14px]">
            <div className="mb-[10px] text-[14px] font-black">
              {editingStageId === null ? "New onboarding stage" : "Edit onboarding stage"}
            </div>
            <div className="grid grid-cols-[1fr_1fr_110px] gap-[12px]">
              <label className="text-[13px] text-yb-muted">
                Stage name
                <input required value={stageForm.name} onChange={(event) => setStageValue("name", event.target.value)} className={inputClass} />
              </label>
              <label className="text-[13px] text-yb-muted">
                Stable code
                <input
                  required
                  readOnly={editingStageId !== null}
                  aria-readonly={editingStageId !== null}
                  value={stageForm.code}
                  onChange={(event) => setStageValue("code", event.target.value.toLowerCase().replace(/\s+/g, "_"))}
                  pattern="[a-z0-9]+(?:_[a-z0-9]+)*"
                  className={`${inputClass} ${editingStageId !== null ? "cursor-not-allowed bg-yb-table-head text-yb-muted3" : ""}`}
                />
                {editingStageId !== null && (
                  <span className="mt-[4px] block text-[11.5px] text-yb-muted3">
                    Technical identifier used by records and automations. It cannot be changed after creation.
                  </span>
                )}
              </label>
              <label className="text-[13px] text-yb-muted">
                Order
                <input type="number" min="0" required value={stageForm.position} onChange={(event) => setStageValue("position", Number(event.target.value))} className={inputClass} />
              </label>
            </div>
            <label className="mt-[10px] block text-[13px] text-yb-muted">
              Description
              <input value={stageForm.description} maxLength={300} onChange={(event) => setStageValue("description", event.target.value)} className={inputClass} />
            </label>
            <div className="mt-[12px] flex flex-wrap gap-[9px]">
              {([
                ["active", "Active"],
                ["completionStage", "Completion stage"],
                ["blocksCompletionUntilReviewed", "Block completion until required information is reviewed"],
                ["generatesTask", "Generate milestone task"],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-[6px] border border-yb-line-btn bg-white px-[9px] py-[6px] text-[12.5px]">
                  <input type="checkbox" checked={stageForm[key]} onChange={(event) => setStageValue(key, event.target.checked)} />
                  {label}
                </label>
              ))}
            </div>
            {stageForm.generatesTask && (
              <div className="mt-[12px] grid grid-cols-3 gap-[12px] border-t border-yb-line-soft pt-[11px]">
                <label className="text-[13px] text-yb-muted">
                  Responsible role
                  <select value={stageForm.responsibleRole ?? ""} onChange={(event) => setStageValue("responsibleRole", (event.target.value || null) as SetupRole | null)} className={inputClass}>
                    <option value="">Select role</option>
                    {(Object.keys(ROLE_LABELS) as SetupRole[]).map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                  </select>
                </label>
                <label className="text-[13px] text-yb-muted">
                  Priority
                  <select value={stageForm.taskPriority} onChange={(event) => setStageValue("taskPriority", event.target.value as TaskPriority)} className={inputClass}>
                    {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((priority) => <option key={priority} value={priority}>{PRIORITY_LABELS[priority]}</option>)}
                  </select>
                </label>
                <label className="text-[13px] text-yb-muted">
                  Expected duration (minutes)
                  <input type="number" min="1" required value={stageForm.expectedDurationMinutes ?? ""} onChange={(event) => setStageValue("expectedDurationMinutes", event.target.value ? Number(event.target.value) : null)} className={inputClass} />
                </label>
              </div>
            )}
            {stageError && <div className="mt-[9px] text-[13px] text-yb-red">{stageError}</div>}
            <div className="mt-[12px] flex gap-[9px]">
              <PrimaryButton type="submit" disabled={stageMutation.isPending}>{stageMutation.isPending ? "Saving…" : "Save Stage"}</PrimaryButton>
              <SecondaryButton type="button" onClick={closeStageForm}>Cancel</SecondaryButton>
            </div>
          </form>
        )}

        <table className="w-full table-fixed border-collapse text-[13.5px]">
          <thead>
            <tr className="bg-yb-table-head">
              <th className="w-[70px] border-b border-yb-line py-[7px] pl-[14px] text-left font-bold text-yb-muted">Order</th>
              <th className="w-[210px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">Stage</th>
              <th className="border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">Behavior</th>
              <th className="w-[260px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">Generated task</th>
              <th className="w-[85px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">Status</th>
              <th className="w-[70px] border-b border-yb-line py-[7px] pr-[14px] text-right font-bold text-yb-muted">Action</th>
            </tr>
          </thead>
          <tbody>
            {stages.map((stage) => (
              <tr key={stage.id} className="hover:bg-yb-row-hover">
                <td className="border-b border-yb-line-row py-[10px] pl-[14px] font-bold">{stage.position}</td>
                <td className="border-b border-yb-line-row px-2 py-[10px]">
                  <div className="font-bold">{stage.name}</div>
                  <div className="mt-[2px] font-mono text-[11px] text-yb-muted3">{stage.code}</div>
                </td>
                <td className="border-b border-yb-line-row px-2 py-[10px] text-yb-ink2">
                  {stage.completionStage && <div className="font-bold text-yb-green">Completion stage</div>}
                  {stage.blocksCompletionUntilReviewed && <div>Requires reviewed information</div>}
                  {!stage.completionStage && !stage.blocksCompletionUntilReviewed && <div>Standard stage</div>}
                </td>
                <td className="border-b border-yb-line-row px-2 py-[10px] text-yb-ink2">
                  {stage.generatesTask ? (
                    <>{stage.responsibleRole ? ROLE_LABELS[stage.responsibleRole] : "Role missing"} · {PRIORITY_LABELS[stage.taskPriority]} · {formatDuration(stage.expectedDurationMinutes)}</>
                  ) : "No automatic task"}
                </td>
                <td className="border-b border-yb-line-row px-2 py-[10px]">{stage.active ? <span className="font-bold text-yb-green">Active</span> : <span className="text-yb-muted3">Inactive</span>}</td>
                <td className="border-b border-yb-line-row py-[10px] pr-[14px] text-right"><button type="button" onClick={() => openEditStage(stage)} className="text-yb-green underline">Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mx-[22px] mb-[26px] border border-yb-line bg-white">
        <div className="flex items-center border-b border-yb-line bg-yb-panel-head px-[14px] py-[9px]">
          <div>
            <div className="text-[11.5px] font-bold tracking-[1.1px] text-yb-panel-head-text">REQUIRED INFORMATION</div>
            <div className="mt-[2px] text-[12px] text-yb-muted3">Required + review means the completion stage is blocked until staff confirm the field.</div>
          </div>
          <div className="flex-1" />
          <PrimaryButton onClick={fieldFormOpen ? closeFieldForm : openNewField}>{fieldFormOpen ? "Cancel" : "+ New Field Rule"}</PrimaryButton>
        </div>

        {fieldFormOpen && (
          <form onSubmit={submitField} className="border-b border-yb-line bg-yb-toolbar p-[14px]">
            <div className="mb-[10px] text-[14px] font-black">{editingFieldId === null ? "New information rule" : "Edit information rule"}</div>
            <div className="grid grid-cols-[180px_1fr_1fr_100px] gap-[12px]">
              <label className="text-[13px] text-yb-muted">Record type<select value={fieldForm.entityType} onChange={(event) => setFieldValue("entityType", event.target.value as RequirementEntity)} className={inputClass}>{(Object.keys(ENTITY_LABELS) as RequirementEntity[]).map((entity) => <option key={entity} value={entity}>{ENTITY_LABELS[entity]}</option>)}</select></label>
              <label className="text-[13px] text-yb-muted">Display label<input required value={fieldForm.label} onChange={(event) => setFieldValue("label", event.target.value)} className={inputClass} /></label>
              <label className="text-[13px] text-yb-muted">
                Stable field key
                <input
                  required
                  readOnly={editingFieldId !== null}
                  aria-readonly={editingFieldId !== null}
                  value={fieldForm.fieldKey}
                  onChange={(event) => setFieldValue("fieldKey", event.target.value.toLowerCase().replace(/\s+/g, "_"))}
                  pattern="[a-z0-9]+(?:_[a-z0-9]+)*"
                  className={`${inputClass} ${editingFieldId !== null ? "cursor-not-allowed bg-yb-table-head text-yb-muted3" : ""}`}
                />
                {editingFieldId !== null && (
                  <span className="mt-[4px] block text-[11.5px] text-yb-muted3">
                    Technical identifier. It cannot be changed after creation.
                  </span>
                )}
              </label>
              <label className="text-[13px] text-yb-muted">Order<input type="number" min="0" required value={fieldForm.position} onChange={(event) => setFieldValue("position", Number(event.target.value))} className={inputClass} /></label>
            </div>
            <div className="mt-[12px] flex flex-wrap gap-[9px]">
              {([
                ["required", "Required"],
                ["requiresReview", "Staff review required"],
                ["active", "Active"],
              ] as const).map(([key, label]) => <label key={key} className="flex items-center gap-[6px] border border-yb-line-btn bg-white px-[9px] py-[6px] text-[12.5px]"><input type="checkbox" checked={fieldForm[key]} onChange={(event) => setFieldValue(key, event.target.checked)} />{label}</label>)}
            </div>
            {fieldError && <div className="mt-[9px] text-[13px] text-yb-red">{fieldError}</div>}
            <div className="mt-[12px] flex gap-[9px]"><PrimaryButton type="submit" disabled={fieldMutation.isPending}>{fieldMutation.isPending ? "Saving…" : "Save Field Rule"}</PrimaryButton><SecondaryButton type="button" onClick={closeFieldForm}>Cancel</SecondaryButton></div>
          </form>
        )}

        <table className="w-full table-fixed border-collapse text-[13.5px]">
          <thead><tr className="bg-yb-table-head"><th className="w-[70px] border-b border-yb-line py-[7px] pl-[14px] text-left font-bold text-yb-muted">Order</th><th className="w-[150px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">Record</th><th className="border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">Field</th><th className="w-[125px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">Required</th><th className="w-[150px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">Review gate</th><th className="w-[85px] border-b border-yb-line px-2 py-[7px] text-left font-bold text-yb-muted">Status</th><th className="w-[70px] border-b border-yb-line py-[7px] pr-[14px] text-right font-bold text-yb-muted">Action</th></tr></thead>
          <tbody>{requiredFields.map((field) => <tr key={field.id} className="hover:bg-yb-row-hover"><td className="border-b border-yb-line-row py-[10px] pl-[14px] font-bold">{field.position}</td><td className="border-b border-yb-line-row px-2 py-[10px]">{ENTITY_LABELS[field.entityType]}</td><td className="border-b border-yb-line-row px-2 py-[10px]"><div className="font-bold">{field.label}</div><div className="mt-[2px] font-mono text-[11px] text-yb-muted3">{field.fieldKey}</div></td><td className="border-b border-yb-line-row px-2 py-[10px]">{field.required ? <span className="font-bold text-yb-green">Required</span> : "Optional"}</td><td className="border-b border-yb-line-row px-2 py-[10px]">{field.requiresReview ? "Must be reviewed" : "No review gate"}</td><td className="border-b border-yb-line-row px-2 py-[10px]">{field.active ? <span className="font-bold text-yb-green">Active</span> : <span className="text-yb-muted3">Inactive</span>}</td><td className="border-b border-yb-line-row py-[10px] pr-[14px] text-right"><button type="button" onClick={() => openEditField(field)} className="text-yb-green underline">Edit</button></td></tr>)}</tbody>
        </table>
      </section>

      {settingsQuery.isLoading && <div className="px-[22px] pb-[30px] text-[14px] text-yb-muted3">Loading workflow settings…</div>}
      {settingsQuery.isError && <div className="px-[22px] pb-[30px] text-[14px] text-yb-red">Couldn&rsquo;t load workflow settings.</div>}
    </div>
  );
}
