import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { AppHeader } from "../components/AppShell/AppHeader";
import { PrimaryButton, SecondaryButton } from "../components/AppShell/buttons";
import {
  aiProviderSettingsApi,
  type AiUsageEvent,
  type AiReasoningEffort,
  type OpenAiModel,
} from "../lib/api";
import { NAV_TABS } from "../lib/navTabs";
import { getStoredUser, hasPermission } from "../lib/session";

export const Route = createFileRoute("/ai-provider-settings")({
  beforeLoad: () => {
    if (!hasPermission(getStoredUser(), "integrations.manage")) throw redirect({ to: "/" });
  },
  component: AiProviderSettingsPage,
});

const MODELS: Array<{
  id: OpenAiModel;
  label: string;
  purpose: string;
  input: string;
  output: string;
}> = [
  {
    id: "gpt-5.6-luna",
    label: "GPT-5.6 Luna — Recommended",
    purpose: "Cost-sensitive, high-volume intake classification and response drafts.",
    input: "$0.20",
    output: "$1.20",
  },
  {
    id: "gpt-5.6-terra",
    label: "GPT-5.6 Terra",
    purpose: "Stronger fallback for ambiguous or multi-intent client messages.",
    input: "$2.00",
    output: "$12.00",
  },
  {
    id: "gpt-5.6-sol",
    label: "GPT-5.6 Sol",
    purpose: "Flagship capability; usually unnecessary for routine intake.",
    input: "$4.00",
    output: "$20.00",
  },
];

const inputClass =
  "mt-1 h-[34px] w-full rounded-yb border border-yb-line-btn bg-white px-[9px] text-[14px] text-yb-ink";

function formatDate(value: string | null): string {
  if (!value) return "Not tested yet";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not tested yet" : date.toLocaleString();
}

function AiProviderSettingsPage() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ["ai-provider-settings"],
    queryFn: aiProviderSettingsApi.get,
  });
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState<OpenAiModel>("gpt-5.6-luna");
  const [reasoningEffort, setReasoningEffort] = useState<AiReasoningEffort>("low");
  const [maxOutputTokens, setMaxOutputTokens] = useState(800);
  const [enabled, setEnabled] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const settings = settingsQuery.data;
    if (!settings) return;
    setModel(settings.model);
    setReasoningEffort(settings.reasoningEffort);
    setMaxOutputTokens(settings.maxOutputTokens);
    setEnabled(settings.enabled);
  }, [settingsQuery.data]);

  const testMutation = useMutation({
    mutationFn: () => aiProviderSettingsApi.test({
      ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
      model,
    }),
    onSuccess: (result) => {
      setError(null);
      setMessage(result.message);
      void queryClient.invalidateQueries({ queryKey: ["ai-provider-usage"] });
    },
    onError: (nextError: unknown) => {
      setMessage(null);
      setError(nextError instanceof Error ? nextError.message : "Connection test failed");
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => aiProviderSettingsApi.save({
      ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
      model,
      reasoningEffort,
      maxOutputTokens,
      enabled,
    }),
    onSuccess: async (saved) => {
      setApiKey("");
      setShowKey(false);
      setError(null);
      setMessage(`Connected and saved — ${saved.model} is ready.`);
      await queryClient.invalidateQueries({ queryKey: ["ai-provider-settings"] });
      await queryClient.invalidateQueries({ queryKey: ["ai-provider-usage"] });
    },
    onError: (nextError: unknown) => {
      setMessage(null);
      setError(nextError instanceof Error ? nextError.message : "Could not save AI settings");
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    saveMutation.mutate();
  }

  const settings = settingsQuery.data;
  const selectedModel = MODELS.find((item) => item.id === model) ?? MODELS[0]!;
  const busy = testMutation.isPending || saveMutation.isPending;
  const needsKey = !settings?.configured;

  return (
    <div className="min-w-[1180px] bg-white text-yb-ink">
      <AppHeader tabs={NAV_TABS} />

      <div className="flex items-center gap-[14px] px-[22px] pt-[16px] pb-[14px]">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-yb-tile bg-yb-green">
          <div className="h-[13px] w-[13px] rounded-[1px] border-2 border-yb-gold" />
        </div>
        <div>
          <div className="text-[10.5px] font-bold tracking-[1.4px] text-yb-muted4">SETUP · INTEGRATIONS</div>
          <h1 className="mt-[1px] yb-page-title">AI Provider</h1>
          <p className="mt-[3px] text-[13px] text-yb-muted3">
            Connect OpenAI for intake classification, structured extraction, and staff-reviewed response drafts.
          </p>
        </div>
      </div>

      {settingsQuery.isError && (
        <div className="mx-[22px] mb-[14px] border border-yb-red bg-[#fff7f5] px-[14px] py-[10px] text-[13px] text-yb-red">
          {settingsQuery.error instanceof Error ? settingsQuery.error.message : "Could not load AI provider settings"}
        </div>
      )}

      <form onSubmit={submit} className="yb-card mx-[22px] mb-[26px] grid grid-cols-[minmax(0,1fr)_340px] border border-yb-line bg-white">
        <div className="min-w-0">
          <div className="flex items-center border-b border-yb-line bg-yb-panel-head px-[14px] py-[9px]">
            <div className="text-[11.5px] font-bold tracking-[1.1px] text-yb-panel-head-text">OPENAI CONNECTION</div>
            <div className="flex-1" />
            <span className={`flex items-center gap-[6px] text-[12px] font-bold ${
              settings?.configured && settings.connectionStatus === "connected" ? "text-yb-green" : "text-yb-amber"
            }`}>
              <span className={`h-[7px] w-[7px] rounded-full ${
                settings?.configured && settings.connectionStatus === "connected" ? "bg-[#2f8a4f]" : "bg-yb-gold"
              }`} />
              {settings?.configured ? "Connected" : "Not connected"}
            </span>
          </div>

          <div className="p-[16px]">
            {!settings?.encryptionReady && !settingsQuery.isLoading && (
              <div className="mb-[14px] border border-yb-gold bg-[#fffaf0] px-[12px] py-[9px] text-[12.5px] text-yb-ink2">
                Server encryption is not configured. Add <strong>AI_SECRETS_ENCRYPTION_KEY</strong> to the API environment before saving an API key.
              </div>
            )}

            <div className="grid grid-cols-2 gap-x-[24px] gap-y-[14px]">
              <label className="text-[13px] text-yb-muted">
                Provider
                <select className={inputClass} value="openai" disabled>
                  <option value="openai">OpenAI API</option>
                </select>
              </label>

              <label className="text-[13px] text-yb-muted">
                Model
                <select value={model} onChange={(event) => setModel(event.target.value as OpenAiModel)} className={inputClass}>
                  {MODELS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </label>

              <div className="col-span-2">
                <label htmlFor="openai-api-key" className="text-[13px] text-yb-muted">OpenAI project API key</label>
                <div className="mt-1 flex gap-[8px]">
                  <input
                    id="openai-api-key"
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    required={needsKey}
                    autoComplete="new-password"
                    placeholder={settings?.configured ? `Saved key ending in ${settings.apiKeyLastFour}` : "sk-proj-…"}
                    className="h-[34px] flex-1 rounded-yb border border-yb-line-btn bg-white px-[9px] font-mono text-[13px] text-yb-ink"
                  />
                  <SecondaryButton type="button" onClick={() => setShowKey((shown) => !shown)}>
                    {showKey ? "Hide" : "Show"}
                  </SecondaryButton>
                </div>
                <div className="mt-[4px] text-[11.5px] text-yb-muted3">
                  {settings?.configured
                    ? "Leave blank to keep the saved credential. Enter a new key to replace it."
                    : "Use a project key created for YB Travel—not a personal ChatGPT password."}
                </div>
              </div>

              <label className="text-[13px] text-yb-muted">
                Reasoning effort
                <select value={reasoningEffort} onChange={(event) => setReasoningEffort(event.target.value as AiReasoningEffort)} className={inputClass}>
                  <option value="none">None — lowest latency</option>
                  <option value="low">Low — recommended</option>
                  <option value="medium">Medium — harder messages</option>
                </select>
              </label>

              <label className="text-[13px] text-yb-muted">
                Maximum output tokens
                <input type="number" min="100" max="4000" value={maxOutputTokens} onChange={(event) => setMaxOutputTokens(Number(event.target.value))} className={inputClass} />
              </label>
            </div>

            <label className="mt-[16px] flex items-center gap-[7px] text-[13px] font-bold text-yb-ink2">
              <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
              Enable AI-assisted intake after this connection is saved
            </label>

            {(message || error) && (
              <div role={error ? "alert" : "status"} className={`mt-[14px] border px-[12px] py-[9px] text-[13px] ${
                error ? "border-yb-red bg-[#fff7f5] text-yb-red" : "border-[#8bb69a] bg-yb-row-hover text-yb-green"
              }`}>
                {error ?? message}
              </div>
            )}
          </div>

          <div className="flex items-center gap-[9px] border-t border-yb-line bg-yb-panel-head px-[14px] py-[10px]">
            <SecondaryButton type="button" disabled={busy || (needsKey && !apiKey.trim())} onClick={() => testMutation.mutate()}>
              {testMutation.isPending ? "Testing…" : "Test connection"}
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={busy || (needsKey && !apiKey.trim()) || !settings?.encryptionReady}>
              {saveMutation.isPending ? "Testing and saving…" : settings?.configured ? "Save settings" : "Save & connect"}
            </PrimaryButton>
            <div className="flex-1" />
            <span className="text-[11.5px] text-yb-muted3">Last tested: {formatDate(settings?.lastTestedAt ?? null)}</span>
          </div>
        </div>

        <aside className="border-l border-yb-line bg-yb-toolbar p-[16px]">
          <div className="text-[10.5px] font-bold tracking-[1.2px] text-yb-panel-head-text">SELECTED MODEL</div>
          <div className="mt-[7px] text-[16px] font-black">{selectedModel.label.replace(" — Recommended", "")}</div>
          <p className="mt-[5px] text-[12.5px] leading-[18px] text-yb-muted2">{selectedModel.purpose}</p>
          <div className="mt-[12px] grid grid-cols-2 border border-yb-line-soft bg-white text-center">
            <div className="border-r border-yb-line-soft p-[9px]"><div className="text-[10.5px] text-yb-muted4">INPUT / 1M</div><div className="mt-[2px] text-[15px] font-black">{selectedModel.input}</div></div>
            <div className="p-[9px]"><div className="text-[10.5px] text-yb-muted4">OUTPUT / 1M</div><div className="mt-[2px] text-[15px] font-black">{selectedModel.output}</div></div>
          </div>
          <div className="mt-[5px] text-[10.5px] text-yb-muted4">Reference prices as of August 31, 2026. OpenAI billing remains authoritative.</div>

          <div className="my-[14px] border-t border-yb-line-row" />
          <div className="text-[10.5px] font-bold tracking-[1.2px] text-yb-panel-head-text">MANDATORY SAFEGUARDS</div>
          <div className="mt-[8px] space-y-[8px]">
            <Safeguard label="Human approval before a client reply is sent" />
            <Safeguard label="Sensitive-data redaction before AI processing" />
            <Safeguard label="AI returns drafts only—no booking or ticket authority" />
            <Safeguard label="API key encrypted and never returned to the browser" />
          </div>

          <div className="my-[14px] border-t border-yb-line-row" />
          <div className="text-[11.5px] leading-[17px] text-yb-muted3">
            YB Travel records token usage and estimated spend below. Your actual credit balance, taxes, adjustments, and spend limit remain authoritative in the OpenAI Platform.
          </div>
        </aside>
      </form>

      <AiUsagePanel />
    </div>
  );
}

function Safeguard({ label }: { label: string }) {
  return <div className="flex gap-[7px] text-[12px] leading-[17px] text-yb-ink2"><span className="font-bold text-yb-green">✓</span><span>{label}</span></div>;
}

type UsagePeriod = 7 | 30 | 90 | "all";

function formatTokens(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function formatCost(value: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "$0.000000";
  return amount >= 0.01 ? `$${amount.toFixed(4)}` : `$${amount.toFixed(6)}`;
}

function usagePurpose(event: AiUsageEvent): string {
  const labels: Record<string, string> = {
    manual_connection_test: "Manual connection test",
    save_connection_test: "Save & connection test",
    intake_classification: "Intake classification",
    information_extraction: "Information extraction",
    response_draft: "Response draft",
  };
  return labels[event.purpose] ?? event.purpose.replaceAll("_", " ");
}

function AiUsagePanel() {
  const [period, setPeriod] = useState<UsagePeriod>(30);
  const usageQuery = useQuery({
    queryKey: ["ai-provider-usage", period],
    queryFn: () => aiProviderSettingsApi.usage(period),
  });
  const report = usageQuery.data;
  const summary = report?.summary;

  return (
    <section className="yb-card mx-[22px] mb-[28px] border border-yb-line bg-white">
      <div className="flex items-center border-b border-yb-line bg-yb-panel-head px-[14px] py-[9px]">
        <div>
          <div className="text-[11.5px] font-bold tracking-[1.1px] text-yb-panel-head-text">AI USAGE & COST HISTORY</div>
          <div className="mt-[2px] text-[11.5px] text-yb-muted3">Every OpenAI request made through YB Travel is recorded without storing the client message or generated text.</div>
        </div>
        <div className="flex-1" />
        <div className="flex border border-yb-line-btn bg-white">
          {([7, 30, 90, "all"] as UsagePeriod[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setPeriod(option)}
              className={`h-[28px] border-r border-yb-line-btn px-[10px] text-[11.5px] font-bold last:border-r-0 ${period === option ? "bg-yb-green text-white" : "text-yb-ink2 hover:bg-yb-row-hover"}`}
            >
              {option === "all" ? "All time" : `${option} days`}
            </button>
          ))}
        </div>
        <a
          href="https://platform.openai.com/settings/organization/billing/overview"
          target="_blank"
          rel="noreferrer"
          className="ml-[9px] text-[11.5px] font-bold text-yb-green underline"
        >
          OpenAI billing ↗
        </a>
      </div>

      {usageQuery.isError ? (
        <div role="alert" className="border-b border-yb-red bg-[#fff7f5] px-[14px] py-[10px] text-[13px] text-yb-red">
          {usageQuery.error instanceof Error ? usageQuery.error.message : "Could not load AI usage"}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-5 border-b border-yb-line">
            <UsageMetric label="PROVIDER REQUESTS" value={summary ? formatTokens(summary.requestCount) : "—"} detail={summary ? `${summary.failedCount} failed` : "Loading"} />
            <UsageMetric label="INPUT TOKENS" value={summary ? formatTokens(summary.inputTokens) : "—"} detail={summary ? `${formatTokens(summary.cachedInputTokens)} cached` : "Loading"} />
            <UsageMetric label="OUTPUT TOKENS" value={summary ? formatTokens(summary.outputTokens) : "—"} detail="Includes reasoning tokens" />
            <UsageMetric label="TOTAL TOKENS" value={summary ? formatTokens(summary.totalTokens) : "—"} detail="Returned by OpenAI" />
            <UsageMetric label="ESTIMATED SPEND" value={summary ? formatCost(summary.estimatedCostUsd) : "—"} detail="USD · local estimate" last />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[12px]">
              <thead className="bg-yb-toolbar text-[10.5px] tracking-[0.8px] text-yb-muted4">
                <tr>
                  <th className="border-b border-yb-line px-[12px] py-[8px]">DATE & TIME</th>
                  <th className="border-b border-yb-line px-[12px] py-[8px]">PURPOSE</th>
                  <th className="border-b border-yb-line px-[12px] py-[8px]">MODEL</th>
                  <th className="border-b border-yb-line px-[12px] py-[8px]">STATUS</th>
                  <th className="border-b border-yb-line px-[12px] py-[8px] text-right">INPUT</th>
                  <th className="border-b border-yb-line px-[12px] py-[8px] text-right">OUTPUT</th>
                  <th className="border-b border-yb-line px-[12px] py-[8px] text-right">TOTAL</th>
                  <th className="border-b border-yb-line px-[12px] py-[8px] text-right">EST. COST</th>
                  <th className="border-b border-yb-line px-[12px] py-[8px]">STAFF</th>
                </tr>
              </thead>
              <tbody>
                {report?.events.map((event) => (
                  <tr key={event.id} className="hover:bg-yb-row-hover">
                    <td className="border-b border-yb-line-row px-[12px] py-[8px] whitespace-nowrap">{new Date(event.createdAt).toLocaleString()}</td>
                    <td className="border-b border-yb-line-row px-[12px] py-[8px] font-bold text-yb-ink2">{usagePurpose(event)}</td>
                    <td className="border-b border-yb-line-row px-[12px] py-[8px] whitespace-nowrap">{event.model}</td>
                    <td className="border-b border-yb-line-row px-[12px] py-[8px]">
                      <span className={event.status === "succeeded" ? "font-bold text-yb-green" : "font-bold text-yb-red"}>
                        {event.status === "succeeded" ? "Succeeded" : `Failed${event.errorCode ? ` · ${event.errorCode}` : ""}`}
                      </span>
                    </td>
                    <td className="border-b border-yb-line-row px-[12px] py-[8px] text-right tabular-nums">{formatTokens(event.inputTokens)}</td>
                    <td className="border-b border-yb-line-row px-[12px] py-[8px] text-right tabular-nums">{formatTokens(event.outputTokens)}</td>
                    <td className="border-b border-yb-line-row px-[12px] py-[8px] text-right font-bold tabular-nums">{formatTokens(event.totalTokens)}</td>
                    <td className="border-b border-yb-line-row px-[12px] py-[8px] text-right font-bold tabular-nums">{formatCost(event.estimatedCostUsd)}</td>
                    <td className="border-b border-yb-line-row px-[12px] py-[8px]">{event.initiatedByName ?? "System"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!usageQuery.isLoading && report?.events.length === 0 && (
              <div className="px-[16px] py-[28px] text-center text-[13px] text-yb-muted3">
                No AI provider requests in this period. New YB Travel AI calls will appear here automatically.
              </div>
            )}
          </div>
          <div className="flex items-center border-t border-yb-line bg-yb-toolbar px-[12px] py-[8px] text-[10.5px] text-yb-muted4">
            <span>Showing the latest 100 requests for this period.</span>
            <span className="mx-[7px]">·</span>
            <span>{report?.pricingNote ?? "Costs are estimates; OpenAI billing is authoritative."}</span>
          </div>
        </>
      )}
    </section>
  );
}

function UsageMetric({ label, value, detail, last = false }: { label: string; value: string; detail: string; last?: boolean }) {
  return (
    <div className={`px-[14px] py-[12px] ${last ? "" : "border-r border-yb-line"}`}>
      <div className="text-[10px] font-bold tracking-[0.9px] text-yb-muted4">{label}</div>
      <div className="mt-[3px] text-[20px] font-black tabular-nums text-yb-ink">{value}</div>
      <div className="mt-[1px] text-[10.5px] text-yb-muted3">{detail}</div>
    </div>
  );
}
