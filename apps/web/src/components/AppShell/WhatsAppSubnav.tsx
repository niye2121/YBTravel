import { Link } from "@tanstack/react-router";

type WhatsAppSubnavProps = {
  active: "inbox" | "groups";
  conversationCount: number;
  groupCount: number;
  showSecondaryTabs?: boolean;
};

function tabClass(active: boolean): string {
  return `flex h-full items-center gap-[7px] whitespace-nowrap border-b-2 text-[13.5px] ${
    active
      ? "border-yb-green font-semibold text-yb-green"
      : "border-transparent text-[#6b6f69] hover:text-yb-ink"
  }`;
}

export function WhatsAppSubnav({
  active,
  conversationCount,
  groupCount,
  showSecondaryTabs = false,
}: WhatsAppSubnavProps) {
  return (
    <nav aria-label="WhatsApp navigation" className="flex h-[44px] shrink-0 items-end gap-[24px] border-b border-yb-line-head bg-white px-[24px]">
      <Link to="/inbox" className={tabClass(active === "inbox")}>
        WhatsApp Inbox
        <span className="rounded-full bg-yb-green px-[7px] py-px text-[11px] text-white">{conversationCount}</span>
      </Link>
      <Link to="/whatsapp-groups" className={tabClass(active === "groups")}>
        Managed Groups
        <span className="font-normal text-yb-muted4">{groupCount}</span>
      </Link>
      {showSecondaryTabs && (
        <>
          <button type="button" className={`yb-inbox-secondary-tab ${tabClass(false)}`}>Email</button>
          <button type="button" className={`yb-inbox-secondary-tab ${tabClass(false)}`}>Assigned to me</button>
        </>
      )}
    </nav>
  );
}
