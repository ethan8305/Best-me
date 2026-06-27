/**
 * Best me — deterministic, rule-based day scheduler (the non-AI half of the
 * hybrid planning brain).
 *
 * Responsibilities:
 *  - plan blocks around fixed calendar events,
 *  - place focus work inside the user's peak-energy windows,
 *  - apply per-category learned estimation factors so estimates self-correct,
 *  - weight deadline-driven work by *spaced* effort (anti-cramming), and
 *  - backfill wellness categories to honor the user's balance quotas.
 *
 * It is pure (no I/O, no Date.now) so it is fully unit-testable. Claude layers
 * on top of this to narrate and adapt the result.
 */

import { Block, Category, Priority, Project } from "../types";
import {
  Interval,
  durationOf,
  freeIntervals,
} from "./intervals";

export interface SchedulableTask {
  id: string;
  title: string;
  category: Category;
  /** Raw user estimate, before the learned estimation factor is applied. */
  estimatedMinutes: number;
  priority: Priority;
  goalId?: string;
  projectId?: string;
  /** ISO date; drives spaced-effort urgency. */
  deadline?: string;
  /** Smallest useful chunk when split. Defaults to the whole estimate. */
  minChunkMinutes?: number;
  /** May this task be split across multiple free intervals? */
  splittable?: boolean;
  /** Deep-focus work that prefers peak-energy windows. */
  focus?: boolean;
}

export interface FixedEvent {
  id?: string;
  title: string;
  start: number;
  end: number;
  category?: Category;
  calendarEventId?: string;
}

export interface ScheduleOptions {
  /** Gap inserted after each placed block. */
  bufferMinutes?: number;
  /** Smallest generated wellness block. */
  minWellnessBlock?: number;
}

export interface ScheduleInput {
  date: string;
  /** Awake/available window, minutes from midnight. */
  dayWindow: Interval;
  fixedEvents: FixedEvent[];
  tasks: SchedulableTask[];
  peakWindows: Interval[];
  /** Desired minimum minutes per category today. */
  quotas: Partial<Record<Category, number>>;
  /** Per-category multiplier; missing entries default to 1.0. */
  estimationFactors: Partial<Record<Category, number>>;
  /** For a mid-day re-plan: only place blocks at or after this minute. */
  now?: number;
  options?: ScheduleOptions;
}

export interface UnplacedTask {
  task: SchedulableTask;
  reason: "no-room" | "too-small";
  remainingMinutes: number;
}

export interface ScheduleResult {
  date: string;
  blocks: Block[];
  unplaced: UnplacedTask[];
  minutesByCategory: Record<Category, number>;
  quotaShortfall: Record<Category, number>;
}

const PRIORITY_WEIGHT: Record<Priority, number> = { low: 1, medium: 2, high: 3 };

const WELLNESS_BACKFILL: Record<string, { title: string; focus: boolean }> = {
  movement: { title: "Movement", focus: false },
  family: { title: "Family / connection", focus: false },
  alone: { title: "Alone time", focus: false },
  rest: { title: "Recharge", focus: false },
};

const emptyByCategory = (): Record<Category, number> => ({
  work: 0,
  movement: 0,
  family: 0,
  alone: 0,
  rest: 0,
});

/** Whole days from `today` until `deadline` (ISO dates); min 0. */
export function daysUntil(deadline: string, today: string): number {
  const ms = Date.parse(deadline) - Date.parse(today);
  return Math.max(0, Math.round(ms / 86_400_000));
}

/**
 * Spaced-effort: spread a project's remaining work evenly over the days left
 * rather than cramming. Returns the recommended minutes to schedule today.
 */
export function spacedDailyTarget(
  remainingMinutes: number,
  daysLeft: number
): number {
  if (remainingMinutes <= 0) return 0;
  // +1 so that on the deadline day (daysLeft 0) we still schedule the remainder.
  return Math.ceil(remainingMinutes / (daysLeft + 1));
}

/**
 * Convert a deadline-driven project into today's schedulable task using
 * spaced effort, so the scheduler chips away at it instead of cramming.
 */
export function projectToTask(project: Project, today: string): SchedulableTask {
  const remaining = Math.max(0, project.estimatedEffortMinutes - project.completedMinutes);
  const daysLeft = daysUntil(project.deadline, today);
  return {
    id: `project-${project.id}`,
    title: project.title,
    category: project.category,
    estimatedMinutes: spacedDailyTarget(remaining, daysLeft),
    priority: project.priority,
    projectId: project.id,
    goalId: project.goalId,
    deadline: project.deadline,
    splittable: true,
    minChunkMinutes: 25,
    focus: project.category === "work",
  };
}

function overlapsAnyPeak(i: Interval, peaks: Interval[]): boolean {
  return peaks.some((p) => i.start < p.end && p.start < i.end);
}

/** Earliest minute within `i` that sits inside a peak window, else i.start. */
function peakAlignedStart(i: Interval, peaks: Interval[]): number {
  const candidates = peaks
    .filter((p) => i.start < p.end && p.start < i.end)
    .map((p) => Math.max(i.start, p.start));
  return candidates.length ? Math.min(...candidates) : i.start;
}

/** Composite urgency score; higher schedules first. Deterministic. */
function taskScore(task: SchedulableTask, input: ScheduleInput): number {
  const today = input.date;
  let score = PRIORITY_WEIGHT[task.priority] * 10;
  if (task.deadline) {
    const days = daysUntil(task.deadline, today);
    score += 30 / (days + 1); // closer deadline → larger boost
  }
  // Under-quota categories get a nudge so balance wins ties.
  const quota = input.quotas[task.category] ?? 0;
  if (quota > 0) score += 2;
  return score;
}

interface MutableInterval extends Interval {}

/**
 * Place a single requirement of `minutes` for `category` into the free space.
 * Mutates `free` in place. Returns the blocks created and the minutes that
 * could not be placed.
 */
function place(
  free: MutableInterval[],
  minutes: number,
  opts: {
    focus: boolean;
    splittable: boolean;
    minChunk: number;
    peaks: Interval[];
    buffer: number;
  }
): { spans: Interval[]; placed: number } {
  const spans: Interval[] = [];
  let remaining = minutes;

  while (remaining > 0) {
    // Minimum span this attempt needs: the whole remainder if we can't split,
    // otherwise one useful chunk.
    const required = opts.splittable ? opts.minChunk : remaining;

    // Candidate intervals that can host `required` minutes at their (possibly
    // peak-aligned) start.
    const usable = free
      .map((iv, idx) => {
        const start = opts.focus ? peakAlignedStart(iv, opts.peaks) : iv.start;
        return { iv, idx, start, available: iv.end - start };
      })
      .filter((c) => c.available >= required);

    if (usable.length === 0) break;

    // Prefer peak-overlapping intervals for focus work; otherwise earliest.
    usable.sort((a, b) => {
      if (opts.focus) {
        const ap = overlapsAnyPeak(a.iv, opts.peaks) ? 0 : 1;
        const bp = overlapsAnyPeak(b.iv, opts.peaks) ? 0 : 1;
        if (ap !== bp) return ap - bp;
      }
      return a.start - b.start;
    });

    const { iv, idx, start, available } = usable[0];
    const take = Math.min(remaining, available);

    spans.push({ start, end: start + take });
    remaining -= take;

    // Rebuild the interval, consuming [start, start+take] plus a buffer.
    const consumedEnd = Math.min(iv.end, start + take + opts.buffer);
    const left: Interval | null =
      start > iv.start ? { start: iv.start, end: start } : null;
    const right: Interval | null =
      consumedEnd < iv.end ? { start: consumedEnd, end: iv.end } : null;
    free.splice(idx, 1, ...[left, right].filter((x): x is Interval => x !== null));

    if (!opts.splittable) break;
  }

  return { spans, placed: minutes - remaining };
}

/**
 * Generate a full day plan: fixed events + placed tasks + wellness backfill.
 */
export function schedule(input: ScheduleInput): ScheduleResult {
  const buffer = input.options?.bufferMinutes ?? 0;
  const minWellness = input.options?.minWellnessBlock ?? 20;
  const peaks = input.peakWindows;

  // 1. Free space around fixed events, clipped to `now` for re-plans.
  const window =
    input.now != null
      ? { start: Math.max(input.dayWindow.start, input.now), end: input.dayWindow.end }
      : input.dayWindow;
  const free: MutableInterval[] = freeIntervals(
    window,
    input.fixedEvents.map((e) => ({ start: e.start, end: e.end }))
  ).map((iv) => ({ ...iv }));

  const minutesByCategory = emptyByCategory();
  const blocks: Block[] = [];
  const unplaced: UnplacedTask[] = [];

  // Fixed events become immovable calendar blocks.
  input.fixedEvents.forEach((e, i) => {
    blocks.push({
      id: e.id ?? `fixed-${i}`,
      title: e.title,
      category: e.category ?? "work",
      start: e.start,
      end: e.end,
      estimatedMinutes: e.end - e.start,
      source: "calendar",
      status: "planned",
      calendarEventId: e.calendarEventId,
      fixed: true,
    });
    if (e.category) minutesByCategory[e.category] += e.end - e.start;
  });

  // 2. Place tasks in priority/urgency order.
  const ordered = [...input.tasks].sort((a, b) => {
    const diff = taskScore(b, input) - taskScore(a, input);
    return diff !== 0 ? diff : a.id.localeCompare(b.id);
  });

  for (const task of ordered) {
    const factor = input.estimationFactors[task.category] ?? 1;
    const adjusted = Math.round(task.estimatedMinutes * factor);
    const minChunk = Math.min(task.minChunkMinutes ?? adjusted, adjusted);

    const { spans, placed } = place(free, adjusted, {
      focus: !!task.focus,
      splittable: !!task.splittable,
      minChunk,
      peaks,
      buffer,
    });

    spans.forEach((span, i) => {
      blocks.push({
        id: spans.length > 1 ? `${task.id}-${i + 1}` : task.id,
        title: task.title,
        category: task.category,
        start: span.start,
        end: span.end,
        estimatedMinutes: durationOf(span),
        source: "ai",
        status: "planned",
        goalId: task.goalId,
        projectId: task.projectId,
      });
      minutesByCategory[task.category] += durationOf(span);
    });

    if (placed < adjusted) {
      unplaced.push({
        task,
        reason: placed === 0 ? "no-room" : "too-small",
        remainingMinutes: adjusted - placed,
      });
    }
  }

  // 3. Backfill wellness categories that are still under quota, so the day can
  //    qualify as balanced for the streak.
  for (const cat of Object.keys(WELLNESS_BACKFILL) as Category[]) {
    const quota = input.quotas[cat] ?? 0;
    let shortfall = quota - minutesByCategory[cat];
    let n = 0;
    while (shortfall >= minWellness && free.some((iv) => durationOf(iv) >= minWellness)) {
      const { spans, placed } = place(free, shortfall, {
        focus: false,
        splittable: true,
        minChunk: minWellness,
        peaks,
        buffer,
      });
      if (placed === 0) break;
      spans.forEach((span) => {
        n += 1;
        blocks.push({
          id: `wellness-${cat}-${n}`,
          title: WELLNESS_BACKFILL[cat].title,
          category: cat,
          start: span.start,
          end: span.end,
          estimatedMinutes: durationOf(span),
          source: "ai",
          status: "planned",
        });
        minutesByCategory[cat] += durationOf(span);
      });
      shortfall = quota - minutesByCategory[cat];
    }
  }

  // 4. Final shortfall report.
  const quotaShortfall = emptyByCategory();
  (Object.keys(quotaShortfall) as Category[]).forEach((cat) => {
    quotaShortfall[cat] = Math.max(0, (input.quotas[cat] ?? 0) - minutesByCategory[cat]);
  });

  blocks.sort((a, b) => a.start - b.start);

  return { date: input.date, blocks, unplaced, minutesByCategory, quotaShortfall };
}
