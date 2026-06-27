/**
 * Pure interval math over "minutes from midnight" ranges.
 * Used by the scheduler to compute free time around fixed calendar events.
 */

export interface Interval {
  start: number;
  end: number;
}

export const durationOf = (i: Interval): number => Math.max(0, i.end - i.start);

/** Merge overlapping / touching intervals into a sorted, disjoint set. */
export function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = [...intervals]
    .filter((i) => i.end > i.start)
    .sort((a, b) => a.start - b.start);
  const merged: Interval[] = [];
  for (const cur of sorted) {
    const last = merged[merged.length - 1];
    if (last && cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end);
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

/** Clamp an interval to the bounds of a window; returns null if it falls outside. */
export function clampToWindow(i: Interval, window: Interval): Interval | null {
  const start = Math.max(i.start, window.start);
  const end = Math.min(i.end, window.end);
  return end > start ? { start, end } : null;
}

/**
 * Return the free sub-intervals of `window` after removing all `busy` spans.
 * Busy spans are merged and clamped to the window first.
 */
export function freeIntervals(window: Interval, busy: Interval[]): Interval[] {
  const blocked = mergeIntervals(
    busy
      .map((b) => clampToWindow(b, window))
      .filter((b): b is Interval => b !== null)
  );

  const free: Interval[] = [];
  let cursor = window.start;
  for (const b of blocked) {
    if (b.start > cursor) free.push({ start: cursor, end: b.start });
    cursor = Math.max(cursor, b.end);
  }
  if (cursor < window.end) free.push({ start: cursor, end: window.end });
  return free;
}

/** Total free minutes in a set of intervals. */
export function totalMinutes(intervals: Interval[]): number {
  return intervals.reduce((sum, i) => sum + durationOf(i), 0);
}
