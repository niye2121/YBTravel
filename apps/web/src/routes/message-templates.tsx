import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { AppHeader } from "../components/AppShell/AppHeader";
import { PrimaryButton, SecondaryButton } from "../components/AppShell/buttons";
import {
  messageTemplatesApi,
  type MessageTemplate,
  type MessageTemplateInput,
} from "../lib/api";
import { NAV_TABS } from "../lib/navTabs";
import { getStoredUser, hasAdminRole } from "../lib/session";

export const Route = createFileRoute("/message-templates")({
  beforeLoad: () => {
    if (!hasAdminRole(getStoredUser())) throw redirect({ to: "/" });
  },
  component: MessageTemplatesPage,
});

const inputClass =
  "mt-1 h-[34px] w-full rounded-yb border border-yb-line-btn bg-white px-[9px] text-[14px] text-yb-ink";

const EMPTY_FORM: MessageTemplateInput = {
  code: "",
  name: "",
  purpose: "",
  languageCode: "en",
  languageName: "English",
  messageBody: "",
  active: true,
};

const PLACEHOLDERS = [
  "{{client_name}}",
  "{{request_number}}",
  "{{missing_items}}",
  "{{fee_amount}}",
  "{{currency}}",
  "{{departure_date}}",
  "{{agent_name}}",
];

function normalizedCode(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function MessageTemplatesPage() {
  const queryClient = useQueryClient();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const templatesQuery = useQuery({
    queryKey: ["message-templates", "admin"],
    queryFn: messageTemplatesApi.listAll,
  });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<MessageTemplateInput>(EMPTY_FORM);
  const [languageFilter, setLanguageFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: (input: MessageTemplateInput) =>
      editingId === null
        ? messageTemplatesApi.create(input)
        : messageTemplatesApi.update(editingId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      resetForm();
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Failed to save message template");
    },
  });

  const templates = templatesQuery.data ?? [];
  const languages = useMemo(
    () => Array.from(new Map(templates.map((item) => [item.languageCode, item.languageName])).entries()),
    [templates],
  );
  const visibleTemplates = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return templates.filter((template) => {
      const matchesLanguage = languageFilter === "all" || template.languageCode === languageFilter;
      const matchesSearch =
        !needle ||
        [template.name, template.purpose, template.code, template.messageBody]
          .some((value) => value.toLowerCase().includes(needle));
      return matchesLanguage && matchesSearch;
    });
  }, [languageFilter, search, templates]);

  function setField<K extends keyof MessageTemplateInput>(key: K, value: MessageTemplateInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  function openNewForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setError(null);
  }

  function openEditForm(template: MessageTemplate) {
    setEditingId(template.id);
    setForm({
      code: template.code,
      name: template.name,
      purpose: template.purpose,
      languageCode: template.languageCode,
      languageName: template.languageName,
      messageBody: template.messageBody,
      active: template.active,
    });
    setShowForm(true);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function insertPlaceholder(placeholder: string) {
    const textarea = bodyRef.current;
    const start = textarea?.selectionStart ?? form.messageBody.length;
    const end = textarea?.selectionEnd ?? start;
    const next = `${form.messageBody.slice(0, start)}${placeholder}${form.messageBody.slice(end)}`;
    setField("messageBody", next);
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(start + placeholder.length, start + placeholder.length);
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    saveMutation.mutate({
      ...form,
      code: normalizedCode(form.code),
      languageCode: form.languageCode.trim().toLowerCase(),
    });
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
          <h1 className="mt-[1px] text-[26px] font-black tracking-[-0.2px]">Message Templates</h1>
          <p className="mt-[3px] text-[13px] text-yb-muted3">
            Maintain approved, copy-ready WhatsApp messages by scenario and language.
          </p>
        </div>
        <div className="flex-1" />
        <PrimaryButton onClick={showForm ? resetForm : openNewForm}>
          {showForm ? "Cancel" : "+ New Template"}
        </PrimaryButton>
      </div>

      <div className="mx-[22px] mb-[14px] grid grid-cols-2 gap-[12px]">
        <div className="border border-[#e6d9ab] bg-[#fdf7e6] px-[12px] py-[9px] text-[12.5px] leading-[18px] text-[#785f12]">
          <span className="font-bold">Starter content:</span> Review wording and translations before live use. Editing a starter updates it in place; migrations never overwrite your changes.
        </div>
        <div className="border border-yb-line bg-yb-panel-head px-[12px] py-[9px] text-[12.5px] leading-[18px] text-yb-ink2">
          <span className="font-bold text-yb-green">Sensitive-data rule:</span> Never request complete card numbers, CVV codes, passwords, or account credentials in WhatsApp.
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mx-[22px] mb-[18px] border border-yb-line bg-yb-panel-head p-[16px]">
          <div className="mb-[12px] flex items-center gap-[10px]">
            <div className="text-[16px] font-black">
              {editingId === null ? "New message template" : "Edit message template"}
            </div>
            {editingId !== null && templates.find((item) => item.id === editingId)?.isStarter && (
              <span className="bg-[#fdf7e6] px-[7px] py-[3px] text-[10.5px] font-bold text-[#785f12]">STARTER</span>
            )}
          </div>

          <div className="grid grid-cols-5 gap-[12px]">
            <label className="text-[13px] text-yb-muted">
              Template name
              <input required maxLength={120} value={form.name}
                onChange={(event) => setField("name", event.target.value)} placeholder="Welcome" className={inputClass} />
            </label>
            <label className="text-[13px] text-yb-muted">
              Scenario / purpose
              <input required maxLength={120} value={form.purpose}
                onChange={(event) => setField("purpose", event.target.value)} placeholder="Welcome" className={inputClass} />
            </label>
            <label className="text-[13px] text-yb-muted">
              Language
              <input required maxLength={80} value={form.languageName}
                onChange={(event) => setField("languageName", event.target.value)} placeholder="English" className={inputClass} />
            </label>
            <label className="text-[13px] text-yb-muted">
              Language code
              <input required maxLength={12} value={form.languageCode}
                onChange={(event) => setField("languageCode", event.target.value.toLowerCase())} placeholder="en" className={inputClass} />
            </label>
            <label className="text-[13px] text-yb-muted">
              Stable code
              <input required maxLength={80} value={form.code}
                onChange={(event) => setField("code", normalizedCode(event.target.value))} placeholder="welcome_en" className={inputClass} />
            </label>
          </div>

          <label className="mt-[14px] block text-[13px] text-yb-muted">
            Approved message text
            <textarea
              ref={bodyRef}
              required
              maxLength={5000}
              rows={7}
              value={form.messageBody}
              onChange={(event) => setField("messageBody", event.target.value)}
              placeholder="Write the copy-ready message staff may review and send…"
              className="mt-1 min-h-[150px] w-full resize-y rounded-yb border border-yb-line-btn bg-white px-[10px] py-[9px] text-[14px] leading-[21px] text-yb-ink"
            />
          </label>

          <div className="mt-[8px] flex flex-wrap items-center gap-[6px]">
            <span className="mr-[3px] text-[12px] font-bold text-yb-muted">Insert variable:</span>
            {PLACEHOLDERS.map((placeholder) => (
              <button key={placeholder} type="button" onClick={() => insertPlaceholder(placeholder)}
                className="border border-yb-line-btn bg-white px-[7px] py-[4px] font-mono text-[11.5px] text-yb-green hover:bg-yb-row-hover">
                {placeholder}
              </button>
            ))}
            <div className="flex-1" />
            <span className="text-[11.5px] text-yb-muted3">{form.messageBody.length} / 5,000 characters</span>
          </div>

          <div className="mt-[13px] flex items-center gap-[14px]">
            <label className="flex items-center gap-[7px] text-[13px] font-bold text-yb-ink2">
              <input type="checkbox" checked={form.active}
                onChange={(event) => setField("active", event.target.checked)} />
              Active and available to staff
            </label>
            <div className="flex-1" />
            {error && <div role="alert" className="text-[13px] font-bold text-yb-red">{error}</div>}
            <SecondaryButton type="button" onClick={resetForm}>Cancel</SecondaryButton>
            <PrimaryButton type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : editingId === null ? "Create Template" : "Save Changes"}
            </PrimaryButton>
          </div>
        </form>
      )}

      <section className="mx-[22px] mb-[26px] border border-yb-line bg-white">
        <div className="flex items-center gap-[10px] border-b border-yb-line bg-yb-panel-head px-[14px] py-[9px]">
          <div className="text-[11.5px] font-bold tracking-[1.1px] text-yb-panel-head-text">APPROVED MESSAGE TEMPLATES</div>
          <div className="flex-1" />
          <input
            type="search"
            aria-label="Search message templates"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search scenario or message"
            className="h-[30px] w-[260px] border border-yb-line-btn bg-white px-[8px] text-[12.5px]"
          />
          <select value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value)}
            aria-label="Filter by language" className="h-[30px] min-w-[145px] border border-yb-line-btn bg-white px-[8px] text-[12.5px]">
            <option value="all">All languages</option>
            {languages.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>
          <div className="min-w-[70px] text-right text-[11.5px] text-yb-muted3">{visibleTemplates.length} items</div>
        </div>

        <div className="grid grid-cols-2 gap-[12px] p-[12px]">
          {visibleTemplates.map((template) => (
            <article key={template.id} className="border border-yb-line bg-white p-[13px] hover:bg-yb-row-hover">
              <div className="flex items-start gap-[9px]">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-[6px]">
                    <h2 className="text-[15px] font-black">{template.name}</h2>
                    <span className="bg-yb-panel-head px-[6px] py-[2px] text-[10.5px] font-bold text-yb-green">{template.languageName}</span>
                    {template.isStarter && <span className="bg-[#fdf7e6] px-[6px] py-[2px] text-[10.5px] font-bold text-[#785f12]">STARTER</span>}
                    {!template.active && <span className="bg-yb-toolbar px-[6px] py-[2px] text-[10.5px] font-bold text-yb-muted3">INACTIVE</span>}
                  </div>
                  <div className="mt-[3px] text-[11.5px] text-yb-muted3">
                    {template.purpose} · <span className="font-mono">{template.code}</span>
                  </div>
                </div>
                <button type="button" onClick={() => openEditForm(template)} className="text-[13px] font-bold text-yb-green underline">Edit</button>
              </div>
              <div
                dir={template.languageCode === "he" ? "rtl" : "auto"}
                className="mt-[10px] min-h-[78px] whitespace-pre-wrap border-t border-yb-line-soft pt-[9px] text-[13px] leading-[19px] text-yb-ink2"
              >
                {template.messageBody}
              </div>
            </article>
          ))}
        </div>

        {templatesQuery.isLoading && <div className="px-[14px] py-[30px] text-center text-[14px] text-yb-muted3">Loading message templates…</div>}
        {templatesQuery.isError && <div className="px-[14px] py-[30px] text-center text-[14px] text-yb-red">Couldn&rsquo;t load message templates.</div>}
        {!templatesQuery.isLoading && !templatesQuery.isError && visibleTemplates.length === 0 && (
          <div className="px-[14px] py-[30px] text-center">
            <div className="text-[14px] font-bold">No templates match these filters.</div>
            <div className="mt-[4px] text-[13px] text-yb-muted3">Clear the search or create a new scenario.</div>
          </div>
        )}
      </section>
    </div>
  );
}
