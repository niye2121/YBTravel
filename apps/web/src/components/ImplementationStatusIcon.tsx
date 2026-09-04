import { Construction } from "lucide-react";

type ImplementationStatusIconProps = {
  label: string;
  description: string;
  className?: string;
  withinInteractiveControl?: boolean;
};

export function ImplementationStatusIcon({
  label,
  description,
  className = "",
  withinInteractiveControl = false,
}: ImplementationStatusIconProps) {
  const accessibleLabel = `${label}: ${description}`;

  return (
    <span
      tabIndex={withinInteractiveControl ? undefined : 0}
      role="img"
      aria-label={accessibleLabel}
      className={`group/status relative inline-flex shrink-0 cursor-help items-center justify-center text-[#d9a01e] outline-none ${className}`}
    >
      <Construction size={13} strokeWidth={2.2} aria-hidden="true" />
      <span
        role="tooltip"
        className="pointer-events-none absolute top-[calc(100%+7px)] left-1/2 z-[100] hidden w-[260px] -translate-x-1/2 border border-[#213c31] bg-[#102f24] px-[10px] py-[8px] text-left text-[11px] font-normal leading-[1.35] text-white shadow-lg group-hover/status:block group-focus/status:block group-hover/status-parent:block group-focus/status-parent:block"
      >
        <span className="block font-bold text-[#f2c351]">{label}</span>
        <span className="mt-[2px] block text-[#edf2ee]">{description}</span>
      </span>
    </span>
  );
}
