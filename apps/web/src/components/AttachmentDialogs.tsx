import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { recordDocumentsApi, type EntityDocument } from "../lib/api";

function AttachmentDialog({ title, children, onClose, busy = false }: {
  title: string; children: ReactNode; onClose: () => void; busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    ref.current?.querySelector<HTMLButtonElement>("[data-initial-focus]")?.focus();
  }, []);
  return createPortal(
    <dialog ref={ref} aria-label={title}
      onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
      onClose={onClose}
      className="fixed inset-0 m-auto max-h-[90vh] w-[900px] max-w-[calc(100vw-32px)] overflow-y-auto rounded-yb-panel border border-yb-line bg-white p-0 font-sans text-yb-ink shadow-xl backdrop:bg-black/50">
      <header className="flex items-center justify-between gap-4 border-b border-yb-line px-5 py-4">
        <h2 className="text-[18px] font-semibold">{title}</h2>
        <button type="button" disabled={busy} onClick={onClose} aria-label="Close attachment dialog" className="rounded-yb px-3 py-2 text-[13px] hover:bg-yb-row-hover disabled:opacity-50">Close</button>
      </header>
      {children}
    </dialog>, window.document.body,
  );
}

export function AttachmentPreview({ document, onClose, onDownload, downloading }: {
  document: EntityDocument; onClose: () => void; onDownload: () => void; downloading: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let disposed = false;
    let objectUrl: string | undefined;
    setUrl(null); setError(null);
    recordDocumentsApi.preview(document.id).then((blob) => {
      if (disposed) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    }).catch((cause) => { if (!disposed) setError(cause instanceof Error ? cause.message : "Could not load this attachment"); });
    return () => { disposed = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [document.id]);
  return <AttachmentDialog title="Review attachment" onClose={onClose}>
    <div className="flex flex-wrap items-center gap-4 border-b border-yb-line px-5 py-3">
      <div className="min-w-0 flex-1">
        <div className="break-words text-[14px] font-semibold">{document.fileName}</div>
        <div className="mt-1 text-[12px] text-yb-muted3">{document.description || document.mimeType} · {(document.sizeBytes / 1024).toFixed(1)} KB</div>
        <div className="mt-1 text-[12px] text-yb-muted3">Uploaded by {document.uploadedByName ?? "Staff"} · {new Date(document.createdAt).toLocaleString()}</div>
      </div>
      <button type="button" disabled={downloading} onClick={onDownload} className="rounded-yb border border-yb-line-btn px-4 py-2 text-[13px] hover:bg-yb-row-hover disabled:opacity-50">{downloading ? "Downloading…" : "Download"}</button>
    </div>
    <div className="bg-yb-canvas p-4">
      {error ? <p role="alert" className="p-6 text-[13px] text-yb-red">{error}</p> : !url ? <p role="status" className="p-6 text-[13px]">Loading attachment…</p>
        : document.mimeType.startsWith("image/") ? <img src={url} alt={document.fileName} className="mx-auto max-h-[65vh] max-w-full object-contain" onError={() => setError("This image could not be displayed. You can still try downloading it.")} />
          : document.mimeType === "application/pdf" ? <><iframe src={url} title={`Preview of ${document.fileName}`} sandbox="allow-scripts" className="h-[60vh] w-full rounded-yb border border-yb-line bg-white" /><p className="mt-2 text-[12px] text-yb-muted3">If your browser cannot display the PDF, use Download to open it.</p></>
            : <p className="p-6 text-[13px]">Preview is unavailable for this file type. Use Download to open it.</p>}
    </div>
    <p className="px-5 py-3 text-[12px] text-yb-muted3">Viewing an attachment does not automatically confirm onboarding information as reviewed.</p>
  </AttachmentDialog>;
}

export function AttachmentDeleteDialog({ document, pending, error, onClose, onConfirm }: {
  document: EntityDocument; pending: boolean; error: unknown; onClose: () => void; onConfirm: () => void;
}) {
  return <AttachmentDialog title="Delete attachment?" onClose={onClose} busy={pending}>
    <div className="px-5 py-5 text-[14px]">
      <p>Delete <strong className="break-words">{document.fileName}</strong> from this record?</p>
      <p className="mt-3 text-[13px] text-yb-muted3">It will no longer be available to preview or download. A retained copy and deletion history will remain for audit and recovery; there is no restore button in this screen.</p>
      {Boolean(error) && <p role="alert" className="mt-3 text-yb-red">{error instanceof Error ? error.message : "Could not delete this attachment"}</p>}
    </div>
    <footer className="flex justify-end gap-3 border-t border-yb-line px-5 py-4">
      <button type="button" data-initial-focus disabled={pending} onClick={onClose} className="rounded-yb border border-yb-line-btn px-4 py-2 text-[13px] hover:bg-yb-row-hover disabled:opacity-50">Cancel</button>
      <button type="button" disabled={pending} onClick={onConfirm} className="rounded-yb bg-yb-red px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50">{pending ? "Deleting…" : "Delete attachment"}</button>
    </footer>
  </AttachmentDialog>;
}
