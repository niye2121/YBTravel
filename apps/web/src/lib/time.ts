export const MIN = 60 * 1000;
export const HOUR = 60 * MIN;

export function countdown(ms: number): string {
  if (ms <= 0) return "expired";
  const h = Math.floor(ms / HOUR);
  const m = Math.floor((ms % HOUR) / MIN);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

export function greeting(d: Date): string {
  const h = d.getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
