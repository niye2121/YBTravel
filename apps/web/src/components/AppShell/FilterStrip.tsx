import { ImplementationStatusIcon } from "../ImplementationStatusIcon";

export type FilterOption = [string, number] | [string, number, { label: string; description: string }];

type FilterStripProps = {
  filters: FilterOption[];
  active: string;
  onChange: (label: string) => void;
  compact?: boolean;
};

export function FilterStrip({ filters, active, onChange }: FilterStripProps) {
  return (
    <div
      className="flex h-[44px] items-stretch gap-[24px] overflow-x-auto border-b border-yb-line-head bg-white px-[24px]"
    >
      {filters.map(([label, count, implementation]) => {
        const isActive = active === label;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onChange(label)}
            className={`group/status-parent flex shrink-0 items-center gap-[7px] whitespace-nowrap border-b-2 text-[13.5px] ${
              isActive
                ? "border-yb-green font-semibold text-yb-green"
                : "border-transparent font-normal text-yb-muted"
            }`}
          >
            <span>{label}</span>
            {implementation && <ImplementationStatusIcon {...implementation} withinInteractiveControl />}
            <span
              className={`text-[11px] font-normal ${
                isActive ? "rounded-full bg-yb-green px-[7px] py-px text-white" : "text-yb-muted5"
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
