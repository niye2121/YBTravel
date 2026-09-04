import type { ButtonHTMLAttributes } from "react";

export function PrimaryButton({
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`h-[34px] rounded-yb border border-yb-green-darker bg-yb-green px-[18px] text-[14px] font-bold text-white hover:bg-yb-green-hover disabled:cursor-default disabled:border-yb-line-btn disabled:bg-yb-line-soft2 disabled:text-yb-muted5 disabled:hover:bg-yb-line-soft2 ${className}`}
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
      className={`h-[34px] rounded-yb border border-yb-line-btn bg-white px-4 text-[14px] text-yb-ink2 hover:bg-yb-hover-btn ${className}`}
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
