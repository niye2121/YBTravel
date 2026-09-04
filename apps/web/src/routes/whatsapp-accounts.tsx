import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import QRCode from "react-qr-code";
import { AppHeader } from "../components/AppShell/AppHeader";
import { PrimaryButton, SecondaryButton } from "../components/AppShell/buttons";
import { messagingApi } from "../lib/api";
import { NAV_TABS } from "../lib/navTabs";
import { getStoredUser, hasAdminRole } from "../lib/session";

export const Route = createFileRoute("/whatsapp-accounts")({
  beforeLoad: () => { if (!hasAdminRole(getStoredUser())) throw redirect({ to: "/" }); },
  component: WhatsAppAccountsPage,
});

function displayPhone(value: string | null) {
  if (!value) return "Not paired yet";
  return value.startsWith("+") ? value : `+${value}`;
}

function WhatsAppAccountsPage() {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("");
  const accountsQuery = useQuery({ queryKey: ["messaging", "accounts"], queryFn: messagingApi.listAccounts, refetchInterval: 4000 });
  const createMutation = useMutation({
    mutationFn: messagingApi.createAccount,
    onSuccess: async () => { setLabel(""); await queryClient.invalidateQueries({ queryKey: ["messaging"] }); },
  });
  const reconnectMutation = useMutation({
    mutationFn: messagingApi.reconnectAccount,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["messaging"] }),
  });
  const disconnectMutation = useMutation({
    mutationFn: messagingApi.disconnectAccount,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["messaging"] }),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (label.trim()) createMutation.mutate(label.trim());
  }

  const mutationError = createMutation.error ?? reconnectMutation.error ?? disconnectMutation.error;
  return (
    <div className="min-h-screen min-w-[1180px] bg-[#eef0ea] text-yb-ink">
      <AppHeader tabs={NAV_TABS} />
      <div className="flex items-end gap-[14px] px-[22px] py-[16px]">
        <div className="flex-1">
          <div className="text-[10px] font-bold tracking-[1.3px] text-yb-muted4">SETUP · WHATSAPP</div>
          <h1 className="text-[25px] font-black">WhatsApp accounts</h1>
          <p className="mt-[3px] text-[13px] text-yb-muted3">Each number has its own saved session. Conversations remain in YB Travel if a number is disconnected or replaced.</p>
        </div>
        <Link to="/setup" className="text-[12px] font-bold text-yb-green underline">Back to Setup</Link>
      </div>

      <form onSubmit={submit} className="mx-[22px] mb-[14px] flex items-end gap-[10px] border border-yb-line border-t-[3px] border-t-yb-green bg-white p-[14px]">
        <label className="flex-1 text-[12px] font-bold">New account name
          <input value={label} onChange={(event) => setLabel(event.target.value)} maxLength={80} placeholder="For example: Brooklyn Sales" className="mt-[5px] h-[34px] w-full border border-yb-line-btn px-[9px] text-[13px] font-normal" />
        </label>
        <PrimaryButton type="submit" disabled={!label.trim() || createMutation.isPending}>{createMutation.isPending ? "Creating…" : "+ Add WhatsApp account"}</PrimaryButton>
      </form>

      {mutationError && <div role="alert" className="mx-[22px] mb-[12px] border border-yb-red bg-[#fff3f1] px-[12px] py-[8px] text-[12px] text-yb-red">{mutationError instanceof Error ? mutationError.message : "Could not update the WhatsApp account"}</div>}

      <div className="mx-[22px] grid grid-cols-2 gap-[14px] pb-[28px]">
        {(accountsQuery.data ?? []).map((account) => (
          <section key={account.id} className="border border-yb-line border-t-[3px] border-t-yb-green bg-white">
            <div className="flex items-start gap-[12px] border-b border-yb-line-soft bg-yb-panel-head px-[14px] py-[11px]">
              <div className="flex-1">
                <div className="flex items-center gap-[7px]"><h2 className="text-[16px] font-black">{account.label}</h2>{account.isPrimary && <span className="bg-yb-gold px-[6px] py-[2px] text-[9px] font-bold">PRIMARY · EXISTING SESSION</span>}</div>
                <div className="mt-[3px] text-[12px] text-yb-muted3">{displayPhone(account.phoneNumber)}</div>
              </div>
              <span className={`px-[8px] py-[4px] text-[10.5px] font-bold ${account.status === "connected" ? "bg-yb-row-hover text-yb-green" : account.status === "qr_pending" ? "bg-[#fff7dc] text-[#8a6d10]" : "bg-[#fff3f1] text-yb-red"}`}>{account.status === "qr_pending" ? "Waiting for QR scan" : account.status === "connected" ? "Connected" : "Disconnected"}</span>
            </div>
            <div className="min-h-[250px] p-[14px]">
              {account.status === "qr_pending" && account.qr ? (
                <div className="flex items-center gap-[18px]"><div className="border border-yb-line bg-white p-[10px]"><QRCode value={account.qr} size={190} /></div><div className="max-w-[260px] text-[12.5px] leading-[18px] text-yb-muted3"><strong className="text-yb-ink">Scan only for {account.label}.</strong><br />On that phone open WhatsApp → Linked Devices → Link a Device. Other connected accounts remain online.</div></div>
              ) : (
                <div className="flex min-h-[170px] flex-col items-center justify-center text-center"><div className={`mb-[8px] h-[10px] w-[10px] rounded-full ${account.status === "connected" ? "bg-[#2f8a4f]" : "bg-yb-red"}`} /><p className="max-w-[390px] text-[13px] text-yb-muted3">{account.status === "connected" ? "This account is active. Its messages and new conversations are routed through this number." : "Start the connection to restore its saved session or display a fresh QR code."}</p></div>
              )}
              <div className="mt-[10px] flex justify-end gap-[8px] border-t border-yb-line-soft pt-[10px]">
                {account.status === "connected" ? <SecondaryButton className="border-yb-red text-yb-red" disabled={disconnectMutation.isPending} onClick={() => { if (window.confirm(`Disconnect ${account.label}? Stored conversations are preserved and other accounts are unaffected.`)) disconnectMutation.mutate(account.id); }}>Disconnect this account</SecondaryButton> : <PrimaryButton disabled={reconnectMutation.isPending} onClick={() => reconnectMutation.mutate(account.id)}>Try connection again</PrimaryButton>}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
