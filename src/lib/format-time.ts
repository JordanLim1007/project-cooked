/** Format minutes as "45 min" if ≤ 60, otherwise "1 h 30 min" / "2 h". */
export function formatMinutes(total: number | null | undefined): string {
  if (!total || total <= 0) return "";
  if (total <= 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Format seconds as a clock for short timers, or "1 h 5 min" for long ones. */
export function formatSecondsLong(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "";
  const mins = Math.round(seconds / 60);
  return formatMinutes(mins);
}

/** Live countdown clock — always m:ss for ≤ 60 min, otherwise h:mm:ss. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`;
  return `${m}:${ss.toString().padStart(2, "0")}`;
}