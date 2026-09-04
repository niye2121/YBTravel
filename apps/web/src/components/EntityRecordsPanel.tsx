import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { clientRecordsApi, recordDocumentsApi, requestRecordsApi } from "../lib/api";

export function EntityRecordsPanel({ entity, id }: { entity: "client" | "request"; id: number }) {
  const api = entity === "client" ? clientRecordsApi : requestRecordsApi;
  const queryClient = useQueryClient();
  const key = [entity, id, "records"] as const;
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const notesQuery = useQuery({ queryKey: [...key, "notes"], queryFn: () => api.listNotes(id) });
  const documentsQuery = useQuery({ queryKey: [...key, "documents"], queryFn: () => api.listDocuments(id) });
  const activityQuery = useQuery({ queryKey: [...key, "activity"], queryFn: () => api.activity(id) });
  const refresh = async () => Promise.all([
    queryClient.invalidateQueries({ queryKey: [...key, "notes"] }),
    queryClient.invalidateQueries({ queryKey: [...key, "documents"] }),
    queryClient.invalidateQueries({ queryKey: [...key, "activity"] }),
  ]);
  const noteMutation = useMutation({ mutationFn: () => api.addNote(id, note), onSuccess: async () => { setNote(""); await refresh(); } });
  const uploadMutation = useMutation({ mutationFn: () => api.uploadDocument(id, file!, description), onSuccess: async () => { setFile(null); setDescription(""); await refresh(); } });
  const downloadMutation = useMutation({
    mutationFn: async ({ documentId, fileName }: { documentId: string; fileName: string }) => {
      const blob = await recordDocumentsApi.download(documentId); const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a"); anchor.href = url; anchor.download = fileName; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
  });

  function submitNote(event: FormEvent) { event.preventDefault(); if (note.trim()) noteMutation.mutate(); }
  function submitDocument(event: FormEvent) { event.preventDefault(); if (file) uploadMutation.mutate(); }
  const error = noteMutation.error ?? uploadMutation.error ?? downloadMutation.error;

  return (
    <section className="mt-[14px] border border-[#c3cbc2] bg-white">
      <div className="flex items-center border-b border-[#d7dcd5] bg-[#eff2ec] px-[12px] py-[7px]">
        <div className="text-[10px] font-bold tracking-[0.12em] text-[#5c665e]">NOTES, DOCUMENTS &amp; HISTORY</div>
        <div className="flex-1" /><div className="text-[10.5px] text-[#6c766f]">Stored on this {entity}</div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="border-r border-[#d7dcd5] p-[12px]">
          <div className="mb-[7px] text-[11px] font-bold">Internal notes</div>
          <form onSubmit={submitNote}>
            <textarea aria-label={`New ${entity} note`} rows={3} value={note} onChange={(event) => setNote(event.target.value)} maxLength={5000} placeholder="Add an operational note…" className="w-full resize-y border border-[#9aa29a] px-[8px] py-[6px] text-[12px] outline-none focus:border-[#0b5c3b]" />
            <button type="submit" disabled={!note.trim() || noteMutation.isPending} className="mt-[6px] h-[28px] bg-[#0b5c3b] px-[12px] text-[10.5px] font-bold text-white disabled:opacity-50">{noteMutation.isPending ? "Saving…" : "Add note"}</button>
          </form>
          <div className="mt-[10px] max-h-[190px] overflow-y-auto">
            {(notesQuery.data ?? []).map((item) => <div key={item.id} className="border-t border-[#edf0ea] py-[7px]"><div className="whitespace-pre-wrap text-[11.5px] leading-[16px]">{item.body}</div><div className="mt-[3px] text-[9.5px] text-[#6c766f]">{item.createdByName ?? "Staff"} · {new Date(item.createdAt).toLocaleString()}</div></div>)}
            {!notesQuery.isLoading && (notesQuery.data?.length ?? 0) === 0 && <div className="text-[10.5px] text-[#6c766f]">No notes yet.</div>}
          </div>
        </div>
        <div className="border-r border-[#d7dcd5] p-[12px]">
          <div className="mb-[7px] text-[11px] font-bold">Documents</div>
          <form onSubmit={submitDocument}>
            <input aria-label={`Choose ${entity} document`} type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="block w-full text-[10.5px]" />
            <input aria-label="Document description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} placeholder="Description (optional)" className="mt-[6px] h-[29px] w-full border border-[#9aa29a] px-[7px] text-[11px]" />
            <button type="submit" disabled={!file || uploadMutation.isPending} className="mt-[6px] h-[28px] bg-[#0b5c3b] px-[12px] text-[10.5px] font-bold text-white disabled:opacity-50">{uploadMutation.isPending ? "Uploading…" : "Upload document"}</button>
            <div className="mt-[4px] text-[9.5px] text-[#6c766f]">PDF, JPEG, or PNG · maximum 10 MB</div>
          </form>
          <div className="mt-[9px] max-h-[190px] overflow-y-auto">
            {(documentsQuery.data ?? []).map((item) => <div key={item.id} className="border-t border-[#edf0ea] py-[7px]"><button type="button" onClick={() => downloadMutation.mutate({ documentId: item.id, fileName: item.fileName })} className="max-w-full truncate text-left text-[11.5px] font-bold text-[#0b5c3b] underline">{item.fileName}</button><div className="text-[9.5px] text-[#6c766f]">{item.description ?? item.mimeType} · {(item.sizeBytes / 1024).toFixed(1)} KB</div></div>)}
            {!documentsQuery.isLoading && (documentsQuery.data?.length ?? 0) === 0 && <div className="text-[10.5px] text-[#6c766f]">No documents yet.</div>}
          </div>
        </div>
        <div className="p-[12px]">
          <div className="mb-[7px] text-[11px] font-bold">Unified history</div>
          <div className="max-h-[290px] overflow-y-auto">
            {(activityQuery.data ?? []).map((item) => <div key={item.id} className="mb-[7px] border-l-2 border-[#b9d2c1] pl-[7px]"><div className="text-[10.5px] font-bold">{item.title}</div><div className="line-clamp-2 text-[10px] leading-[14px] text-[#59635b]">{item.detail}</div><div className="text-[9px] text-[#7a8580]">{item.actorName ? `${item.actorName} · ` : ""}{new Date(item.occurredAt).toLocaleString()}</div></div>)}
            {!activityQuery.isLoading && (activityQuery.data?.length ?? 0) === 0 && <div className="text-[10.5px] text-[#6c766f]">No recorded activity yet.</div>}
          </div>
        </div>
      </div>
      {error && <div role="alert" className="border-t border-[#e5c5bf] bg-[#fff5f3] px-[12px] py-[7px] text-[10.5px] text-[#a8341f]">{error instanceof Error ? error.message : "The record action failed"}</div>}
    </section>
  );
}
