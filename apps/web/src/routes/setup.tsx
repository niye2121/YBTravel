import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { AppHeader } from "../components/AppShell/AppHeader";
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
  to?: "/users" | "/booking-fees" | "/onboarding-settings";
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
    status: "Needs decisions",
    includes: ["Welcome", "Missing information", "Booking-fee explanation", "Follow-up", "Language and sensitive-data policy"],
  },
  {
    title: "Request Workflow",
    purpose: "Configure request types, statuses, urgency levels, and service deadlines.",
    status: "Needs decisions",
    includes: ["Request types", "Open/closed statuses", "Urgency levels", "Response and follow-up deadlines"],
  },
  {
    title: "Assignment & Reminders",
    purpose: "Control representative availability, capacity, fallback, escalation, and reminder timing.",
    status: "Needs decisions",
    includes: ["Preferred and secondary representative", "Available-team fallback", "Capacity limits", "Unanswered and missing-information reminders"],
  },
  {
    title: "WhatsApp Integration",
    purpose: "Manage the shared number, provider behavior, group creation, and manual fallback.",
    status: "Needs decisions",
    includes: ["Authorized group-creator roles", "Group-name template", "Default staff participants", "Provider and manual fallback policy"],
  },
];

function SetupOverviewPage() {
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
        <span className="font-bold text-yb-green">4 areas are configurable now.</span>{" "}
        The other areas are listed here so the Setup structure is complete, but remain locked until their business rules are approved.
      </div>

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
