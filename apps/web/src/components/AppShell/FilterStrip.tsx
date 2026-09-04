import { ImplementationStatusIcon } from "../ImplementationStatusIcon";

export type FilterOption = [string, number] | [string, number, { label: string; description: string }];

type FilterStripProps = {
  filters: FilterOption[];
  active: string;
  onChange: (label: string) => void;
  compact?: boolean;
};

export function FilterStrip({ filters, active, onChange, compact = false }: FilterStripProps) {
  return (
    <div
      className={`flex items-stretch border-b border-yb-line-head bg-white ${
        compact ? "h-[30px] gap-[22px] px-[16px]" : "h-[40px] gap-[26px] px-[22px]"
      }`}
    >
      {filters.map(([label, count, implementation]) => {
        const isActive = active === label;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onChange(label)}
            className={`group/status-parent mb-[-1px] flex items-center border-b-[3px] px-[2px] ${
              compact ? "gap-[6px] text-[12px]" : "gap-[7px] text-[14px]"
            } ${
              isActive
                ? "border-yb-green font-bold text-[#12352a]"
                : "border-transparent font-normal text-yb-muted"
            }`}
          >
            <span>{label}</span>
            {implementation && <ImplementationStatusIcon {...implementation} withinInteractiveControl />}
            <span
              className={`${compact ? "text-[12px] font-normal" : "text-[13px] font-bold"} ${
                isActive ? "text-yb-gold-count" : "text-yb-muted5"
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
