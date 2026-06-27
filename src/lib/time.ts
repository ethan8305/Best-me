/**
 * Conversions between the scheduler's "minutes from local midnight" integers
 * and real Date / ISO values. Kept dependency-free so it can be unit-tested.
 */

/** Local ISO date (YYYY-MM-DD) for a Date. */
export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Minutes since local midnight for a Date (0–1439). */
export function minutesFromMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** A Date on the given ISO day at `minutes` from local midnight. */
export function dateFromMinutes(date: string, minutes: number): Date {
  const [y, m, day] = date.split("-").map(Number);
  const d = new Date(y, m - 1, day, 0, 0, 0, 0);
  d.setMinutes(minutes);
  return d;
}

/** "HH:MM" label for minutes from midnight. */
export function clock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function todayIso(now: Date = new Date()): string {
  return isoDate(now);
}
