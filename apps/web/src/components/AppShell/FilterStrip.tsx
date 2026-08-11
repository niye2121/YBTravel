type FilterStripProps = {
  filters: [string, number][];
  active: string;
  onChange: (label: string) => void;
};

export function FilterStrip({ filters, active, onChange }: FilterStripProps) {
  return (
    <div className="flex h-[40px] items-stretch gap-[26px] border-b border-yb-line-head bg-white px-[22px]">
      {filters.map(([label, count]) => {
        const isActive = active === label;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onChange(label)}
            className={`mb-[-1px] flex items-center gap-[7px] border-b-[3px] px-[2px] text-[14px] ${
              isActive
                ? "border-yb-green font-bold text-[#12352a]"
                : "border-transparent font-normal text-yb-muted"
            }`}
          >
            <span>{label}</span>
            <span
              className={`text-[13px] font-bold ${isActive ? "text-yb-gold-count" : "text-yb-muted5"}`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
