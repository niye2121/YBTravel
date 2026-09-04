import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "../components/AppShell/AppHeader";
import { systemSettingsApi } from "../lib/api";
import { NAV_TABS } from "../lib/navTabs";
import { getStoredUser, hasAdminRole } from "../lib/session";

export const Route = createFileRoute("/setup")({
  beforeLoad: () => {
    if (!hasAdminRole(getStoredUser())) throw redirect({ to: "/" });
  },
  component: SetupOverviewPage,
});

type SetupCard = {
  title: string;
  purpose: string;
  status: "Available" | "Needs decisions";
  to?: "/users" | "/booking-fees" | "/message-templates" | "/onboarding-settings" | "/request-workflow-settings" | "/ai-provider-settings" | "/assignment-settings" | "/whatsapp-accounts";
  includes: string[];
};

const SETUP_AREAS: SetupCard[] = [
  {
    title: "Users & Roles",
    purpose: "Control who can access the platform and which Phase 1 actions they may perform.",
    status: "Available",
    to: "/users",
    includes: ["Offshore Intake Employee", "Travel Agent", "System Administrator", "Multiple roles per employee"],
  },
  {
    title: "Booking Fees",
    purpose: "Maintain fee groups and passenger calculation rules without code changes.",
    status: "Available",
    to: "/booking-fees",
    includes: ["Amount and currency", "Per passenger or per booking", "Adult, child, and infant rules", "Active/inactive groups"],
  },
  {
    title: "Onboarding Workflow",
    purpose: "Define editable onboarding stages and the milestone task created by each stage.",
    status: "Available",
    to: "/onboarding-settings",
    includes: ["Stage order and labels", "Completion stage", "Review completion gate", "Task role, priority, and expected duration"],
  },
  {
    title: "Required Information",
    purpose: "Define which client, traveller, and request fields are mandatory and must be reviewed.",
    status: "Available",
    to: "/onboarding-settings",
    includes: ["Legal names", "Dates of birth", "Airports", "Travel dates", "Optional request details"],
  },
  {
    title: "Message Templates",
    purpose: "Approve copy-ready WhatsApp text by purpose and language.",
    status: "Available",
    to: "/message-templates",
    includes: ["Welcome", "Missing information", "Booking-fee explanation", "Follow-up", "Language and sensitive-data policy"],
  },
  {
    title: "Request Workflow",
    purpose: "Configure request types, statuses, urgency levels, and deadline targets.",
    status: "Available",
    to: "/request-workflow-settings",
    includes: ["Five approved request types", "Eleven approved statuses", "Normal, High, and Urgent levels", "Response and service deadlines"],
  },
  {
    title: "Assignment & Reminders",
    purpose: "Control representative availability, capacity, fallback, escalation, and reminder timing.",
    status: "Available",
    to: "/assignment-settings",
    includes: ["Preferred and secondary representative", "Available-team fallback", "Capacity limits", "Unanswered and missing-information reminders"],
  },
  {
    title: "WhatsApp Integration",
    purpose: "Connect and operate multiple independent WhatsApp numbers without losing stored conversations.",
    status: "Available",
    to: "/whatsapp-accounts",
    includes: ["Preserved primary session", "Independent QR code per account", "Per-account Inbox routing", "Disconnect one account without affecting the others"],
  },
  {
    title: "AI Provider",
    purpose: "Connect the provider used for intake classification, information extraction, and response drafts.",
    status: "Available",
    to: "/ai-provider-settings",
    includes: ["Encrypted OpenAI API key", "GPT-5.6 Luna recommended", "Usage and estimated cost history", "Mandatory human review and redaction"],
  },
];

function SetupOverviewPage() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({ queryKey: ["system-settings"], queryFn: systemSettingsApi.get });
  const demoDataMutation = useMutation({
    mutationFn: systemSettingsApi.updateDemoData,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["system-settings"] }),
        queryClient.invalidateQueries({ queryKey: ["clients"] }),
        queryClient.invalidateQueries({ queryKey: ["travellers"] }),
      ]);
    },
  });
  const testDataDeletionMutation = useMutation({
    mutationFn: systemSettingsApi.updateTestDataDeletion,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["system-settings"] }),
  });
  const demoDataEnabled = settingsQuery.data?.demoDataEnabled ?? false;
  const testDataDeletionEnabled = settingsQuery.data?.testDataDeletionEnabled ?? false;

  return (
    <div className="min-w-[1280px] bg-white text-yb-ink">
      <AppHeader tabs={NAV_TABS} />

      <div className="flex items-center gap-[14px] px-[22px] pt-[16px] pb-[14px]">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-yb-tile bg-yb-green">
          <div className="h-[13px] w-[13px] rounded-[1px] border-2 border-yb-gold" />
        </div>
        <div>
          <div className="text-[10.5px] font-bold tracking-[1.4px] text-yb-muted4">SYSTEM ADMINISTRATION</div>
          <h1 className="mt-[1px] text-[26px] font-black tracking-[-0.2px]">Phase 1 Setup</h1>
          <p className="mt-[3px] text-[13px] text-yb-muted3">
            Business-controlled rules used by client intake, onboarding, assignments, and WhatsApp work.
          </p>
        </div>
      </div>

      <div className="mx-[22px] mb-[14px] border border-yb-line bg-yb-panel-head px-[14px] py-[11px] text-[13px] text-yb-ink2">
        <span className="font-bold text-yb-green">9 areas are configurable now.</span>{" "}
        The other areas are listed here so the Setup structure is complete, but remain locked until their business rules are approved.
      </div>

      <section className="mx-[22px] mb-[14px] border border-yb-line border-t-[3px] border-t-yb-green bg-white">
        <div className="flex items-center gap-[18px] px-[16px] py-[13px]">
          <div className="flex-1">
            <div className="mb-[3px] text-[10px] font-bold tracking-[1.2px] text-yb-muted2">DEMO DATA</div>
            <h2 className="text-[16px] font-black">Show sample clients and travellers</h2>
            <p className="mt-[4px] max-w-[850px] text-[12.5px] leading-[18px] text-yb-muted">
              Adds read-only Household, Company, and Individual examples to the Clients and Travellers screens. Turn this off before production use; live records are never removed or changed.
            </p>
          </div>
          <label className="flex min-w-[210px] cursor-pointer items-center justify-between gap-[12px] border border-yb-line bg-yb-panel-head px-[12px] py-[9px] text-[12.5px] font-bold">
            <span>{demoDataEnabled ? "Demo data enabled" : "Demo data disabled"}</span>
            <input
              type="checkbox"
              aria-label="Show demo clients and travellers"
              checked={demoDataEnabled}
              disabled={settingsQuery.isLoading || demoDataMutation.isPending}
              onChange={(event) => demoDataMutation.mutate(event.target.checked)}
              className="h-[16px] w-[16px] accent-[#0d5c39]"
            />
          </label>
        </div>
        {demoDataMutation.isError && (
          <div role="alert" className="border-t border-yb-line-soft bg-[#fff5f1] px-[16px] py-[7px] text-[12px] font-bold text-yb-red">
            {demoDataMutation.error instanceof Error ? demoDataMutation.error.message : "Could not update demo data setting"}
          </div>
        )}
      </section>

      <section className="mx-[22px] mb-[14px] border border-yb-red border-t-[3px] border-t-yb-red bg-white">
        <div className="flex items-center gap-[18px] px-[16px] py-[13px]">
          <div className="flex-1">
            <div className="mb-[3px] text-[10px] font-bold tracking-[1.2px] text-yb-red">DESTRUCTIVE TEST TOOL</div>
            <h2 className="text-[16px] font-black">Show “Delete all test data” in the Inbox</h2>
            <p className="mt-[4px] max-w-[880px] text-[12.5px] leading-[18px] text-yb-muted">
              Enables a one-use administrator button that permanently removes operational WhatsApp messages, conversations, groups, requests, clients, travellers, assignments, and notifications. Users, configuration, audit/security history, AI settings and usage, and the connected WhatsApp session are preserved.
            </p>
          </div>
          <label className="flex min-w-[250px] cursor-pointer items-center justify-between gap-[12px] border border-yb-red bg-[#fff3f1] px-[12px] py-[9px] text-[12.5px] font-bold text-yb-red">
            <span>{testDataDeletionEnabled ? "Deletion button enabled" : "Deletion button disabled"}</span>
            <input
              type="checkbox"
              aria-label="Show Delete all test data button in Inbox"
              checked={testDataDeletionEnabled}
              disabled={settingsQuery.isLoading || testDataDeletionMutation.isPending}
              onChange={(event) => testDataDeletionMutation.mutate(event.target.checked)}
              className="h-[16px] w-[16px] accent-[#9c2b1c]"
            />
          </label>
        </div>
        {testDataDeletionMutation.isError && (
          <div role="alert" className="border-t border-yb-line-soft bg-[#fff5f1] px-[16px] py-[7px] text-[12px] font-bold text-yb-red">
            {testDataDeletionMutation.error instanceof Error ? testDataDeletionMutation.error.message : "Could not update test data deletion setting"}
          </div>
        )}
      </section>

      <div className="mx-[22px] mb-[26px] grid grid-cols-4 gap-[12px]">
        {SETUP_AREAS.map((area) => {
          const content = (
            <>
              <div className="flex items-start justify-between gap-[10px]">
                <h2 className="text-[16px] font-black">{area.title}</h2>
                <span className={`shrink-0 px-[7px] py-[3px] text-[10.5px] font-bold ${
                  area.status === "Available"
                    ? "bg-yb-row-hover text-yb-green"
                    : "bg-yb-table-head text-yb-amber"
                }`}>
                  {area.status}
                </span>
              </div>
              <p className="mt-[7px] min-h-[48px] text-[13px] leading-[18px] text-yb-muted">{area.purpose}</p>
              <div className="mt-[10px] border-t border-yb-line-soft pt-[9px]">
                {area.includes.map((item) => (
                  <div key={item} className="mb-[4px] flex gap-[6px] text-[12.5px] text-yb-ink2">
                    <span className="text-yb-gold">•</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              {area.to && <div className="mt-[10px] text-[13px] font-bold text-yb-green underline">Open settings</div>}
            </>
          );

          return area.to ? (
            <Link key={area.title} to={area.to} className="border border-yb-line bg-white p-[14px] hover:bg-yb-row-hover">
              {content}
            </Link>
          ) : (
            <div key={area.title} className="border border-yb-line bg-yb-toolbar p-[14px]">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
