import { Link } from "@tanstack/react-router";

type WhatsAppSubnavProps = {
  active: "inbox" | "groups";
  conversationCount: number;
  groupCount: number;
  showSecondaryTabs?: boolean;
};

function tabClass(active: boolean): string {
  return `flex h-[29px] items-center gap-[6px] border-b-2 px-[1px] text-[12px] ${
    active
      ? "border-yb-green font-bold text-yb-green-darker"
      : "border-transparent text-yb-green hover:border-yb-line-btn"
  }`;
}

export function WhatsAppSubnav({
  active,
  conversationCount,
  groupCount,
  showSecondaryTabs = false,
}: WhatsAppSubnavProps) {
  return (
    <div className="flex h-[30px] items-center gap-[22px] border-b border-yb-line-head bg-white px-[16px]">
      <Link to="/inbox" className={tabClass(active === "inbox")}>
        WhatsApp Inbox
        <span className="rounded-full bg-yb-red px-[5px] py-px text-[10px] font-bold leading-[14px] text-white">{conversationCount}</span>
      </Link>
      <Link to="/whatsapp-groups" className={tabClass(active === "groups")}>
        Managed Groups
        <span className="font-normal text-yb-muted4">{groupCount}</span>
      </Link>
      {showSecondaryTabs && (
        <>
          <button type="button" className="h-[29px] text-[12px] text-yb-green">Email</button>
          <button type="button" className="h-[29px] text-[12px] text-yb-green">Assigned to me</button>
        </>
      )}
    </div>
  );
}
