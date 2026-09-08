import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { PrimaryButton, SecondaryButton } from "./AppShell/buttons";
import { requestsApi, requestWorkflowSettingsApi } from "../lib/api";

export function ClientNewRequest({ clientId, clientName }: { clientId: number; clientName: string }) {
  const [open, setOpen] = useState(false);
  return <>
    <PrimaryButton onClick={() => setOpen(true)}>+ New Request</PrimaryButton>
    {open && <NewRequestDialog clientId={clientId} clientName={clientName} onClose={() => setOpen(false)} />}
  </>;
}

function NewRequestDialog({ clientId, clientName, onClose }: {
  clientId: number; clientName: string; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const summaryInput = useRef<HTMLTextAreaElement>(null);
  const [summary, setSummary] = useState("");
  const [typeId, setTypeId] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ["request-workflow-settings", "active"], queryFn: requestWorkflowSettingsApi.listActive });
  const types = settings.data?.requestTypes ?? [];
  const selectedType = typeId || String((types.find((type) => type.code === "new_flight_booking") ?? types[0])?.id ?? "");
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    summaryInput.current?.focus();
    return () => { element?.close(); };
  }, []);
  const create = useMutation({
    mutationFn: () => requestsApi.create({ clientId, tripSummary: summary.trim(), requestTypeId: Number(selectedType) }),
    onSuccess: (request) => {
      void queryClient.invalidateQueries({ queryKey: ["requests"] });
      void queryClient.invalidateQueries({ queryKey: ["messaging", "group-options"] });
      void navigate({ to: "/requests/$requestId", params: { requestId: String(request.id) } });
      onClose();
    },
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (create.isPending || summary.trim().length < 3 || settings.isError || !types.some((type) => String(type.id) === selectedType)) return;
    create.mutate();
  }
  const controlClass = "mt-2 block w-full rounded-yb border border-yb-line-btn bg-white px-3 py-2 text-[13px] focus:outline-2 focus:outline-yb-green";
  return createPortal(<dialog ref={dialog} aria-labelledby="new-client-request-title"
    onCancel={(event) => { event.preventDefault(); if (!create.isPending) onClose(); }}
    className="fixed inset-0 m-auto max-h-[90vh] w-[560px] max-w-[calc(100vw-32px)] overflow-y-auto rounded-yb-panel border border-yb-line bg-white p-0 font-sans text-yb-ink shadow-xl backdrop:bg-black/50">
    <form onSubmit={submit}>
      <header className="border-b border-yb-line px-5 py-4">
        <h2 id="new-client-request-title" className="text-[18px] font-semibold">New request</h2>
        <p className="mt-1 text-[13px] text-yb-muted3">Create a travel request for this client.</p>
      </header>
      <div className="space-y-4 px-5 py-4">
        <label className="block text-[13px] font-semibold">Client
          <input readOnly value={clientName} className={`${controlClass} bg-yb-canvas`} />
          <span className="mt-1 block text-[12px] font-normal text-yb-muted3">Linked to this profile automatically; the client cannot be changed here.</span>
        </label>
        <label className="block text-[13px] font-semibold">Request type
          <select required value={selectedType} onChange={(event) => setTypeId(event.target.value)} disabled={settings.isPending || create.isPending} className={controlClass}>
            <option value="">{settings.isPending ? "Loading request types…" : "Select request type"}</option>
            {types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
          </select>
        </label>
        {settings.isError && <div role="alert" className="text-[13px] text-yb-red">Could not load request types. <button type="button" className="underline" onClick={() => void settings.refetch()}>Retry</button></div>}
        {settings.isSuccess && !types.length && <p role="alert" className="text-[13px] text-yb-red">No active request types are configured. Ask an administrator to configure them.</p>}
        <label className="block text-[13px] font-semibold">Trip summary
          <textarea ref={summaryInput} required minLength={3} maxLength={200} rows={4} value={summary} disabled={create.isPending} onChange={(event) => setSummary(event.target.value)} placeholder="For example: Two passengers, JFK to Tel Aviv, departing October 15 and returning October 29." className={controlClass} />
          <span className="mt-1 block text-[12px] font-normal text-yb-muted3">{summary.length}/200 characters. You can add more details after creating the request.</span>
        </label>
        {create.isError && <p role="alert" className="text-[13px] text-yb-red">{create.error instanceof Error ? create.error.message : "Could not create request. Please try again."}</p>}
      </div>
      <footer className="flex justify-end gap-3 border-t border-yb-line px-5 py-4">
        <SecondaryButton type="button" disabled={create.isPending} onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton type="submit" disabled={create.isPending || settings.isError || !selectedType || summary.trim().length < 3}>{create.isPending ? "Creating…" : "Create Request"}</PrimaryButton>
      </footer>
    </form>
  </dialog>, document.body);
}
