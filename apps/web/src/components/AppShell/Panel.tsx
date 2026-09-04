import type { ReactNode } from "react";

type PanelProps = {
  title: string;
  right?: ReactNode;
  children?: ReactNode;
  pad?: boolean;
};

export function Panel({ title, right, children, pad }: PanelProps) {
  return (
    <div className="mb-4 rounded-yb border border-yb-line bg-white">
      <div className="flex items-center border-b border-yb-line bg-yb-panel-head px-[14px] py-2">
        <div className="text-[11.5px] font-bold tracking-[1.1px] text-yb-panel-head-text">
          {title}
        </div>
        <div className="flex-1" />
        {right && <div className="text-[11.5px] text-yb-muted3">{right}</div>}
      </div>
      <div className={pad ? "p-[14px]" : undefined}>{children}</div>
    </div>
  );
}
