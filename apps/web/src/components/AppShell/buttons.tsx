import type { ButtonHTMLAttributes } from "react";

export function PrimaryButton({
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`h-[36px] rounded-yb border border-yb-green bg-yb-green px-[16px] text-[13px] font-semibold text-white hover:bg-yb-green-hover disabled:cursor-default disabled:border-yb-line-btn disabled:bg-yb-line-soft2 disabled:text-yb-muted5 disabled:hover:bg-yb-line-soft2 ${className}`}
      {...rest}
    />
  );
}

export function SecondaryButton({
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`h-[36px] rounded-yb border border-yb-line-btn bg-white px-[14px] text-[13px] font-medium text-yb-ink2 hover:bg-yb-hover-btn ${className}`}
      {...rest}
    />
  );
}

export function GoldButton({
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`h-[30px] rounded-yb border border-yb-gold-border bg-yb-gold px-5 text-[13.5px] font-bold text-yb-gold-text hover:bg-yb-gold-hover ${className}`}
      {...rest}
    />
  );
}
