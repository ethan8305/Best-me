/**
 * Best me — streak + wellness scoring.
 *
 * The streak deliberately rewards *balance, not grind*. A day only qualifies
 * when the user honored their work AND took care of at least one wellness need
 * (movement / family / alone / rest). Monthly "freezes" protect the streak from
 * a single off day so progress isn't erased. A rolling Wellness Score makes the
 * streak map to wellbeing rather than being a bare counter.
 *
 * Pure functions — no I/O, no Date.now — so it is fully unit-testable.
 */

import {
  Block,
  Category,
  CATEGORIES,
  StreakState,
  WELLNESS_CATEGORIES,
} from "../types";

export interface StreakConfig {
  /** Fraction of planned work minutes that must be completed to "honor work". */
  workCompletionRatio: number;
  /** How many wellness categories must be honored for a balanced day. */
  minWellnessCategories: number;
  /** Completed minutes needed for a wellness category to count as honored. */
  wellnessHonorMinutes: number;
  /** Cap on banked freezes. */
  maxFreezes: number;
  /** Every N qualifying days earns one freeze. */
  freezeEarnedEvery: number;
}

export const DEFAULT_STREAK_CONFIG: StreakConfig = {
  workCompletionRatio: 0.6,
  minWellnessCategories: 1,
  wellnessHonorMinutes: 20,
  maxFreezes: 3,
  freezeEarnedEvery: 7,
};

export interface DayEvaluation {
  date: string;
  qualified: boolean;
  workSatisfied: boolean;
  honoredWellness: Category[];
  plannedByCategory: Record<Category, number>;
  completedByCategory: Record<Category, number>;
  /** Day wellness score, 0–100. */
  score: number;
}

const emptyByCategory = (): Record<Category, number> => ({
  work: 0,
  movement: 0,
  family: 0,
  alone: 0,
  rest: 0,
});

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

const completedMinutes = (b: Block) =>
  b.status === "done" ? b.actualMinutes ?? b.estimatedMinutes : 0;

/** Whole days from ISO date `a` to ISO date `b`. */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

/**
 * Evaluate a single day's blocks against the balanced-day rule and compute its
 * wellness score.
 */
export function evaluateDay(
  date: string,
  blocks: Block[],
  config: StreakConfig = DEFAULT_STREAK_CONFIG
): DayEvaluation {
  const plannedByCategory = emptyByCategory();
  const completedByCategory = emptyByCategory();

  for (const b of blocks) {
    plannedByCategory[b.category] += b.estimatedMinutes;
    completedByCategory[b.category] += completedMinutes(b);
  }

  const plannedWork = plannedByCategory.work;
  const completedWork = completedByCategory.work;
  const workSatisfied =
    plannedWork === 0 ? true : completedWork / plannedWork >= config.workCompletionRatio;

  const honoredWellness = WELLNESS_CATEGORIES.filter(
    (cat) => completedByCategory[cat] >= config.wellnessHonorMinutes
  );

  const qualified =
    workSatisfied && honoredWellness.length >= config.minWellnessCategories;

  const breadth = honoredWellness.length / WELLNESS_CATEGORIES.length;
  const workScore = plannedWork === 0 ? 1 : clamp01(completedWork / plannedWork);
  const score = Math.round(100 * (0.6 * breadth + 0.4 * workScore));

  return {
    date,
    qualified,
    workSatisfied,
    honoredWellness,
    plannedByCategory,
    completedByCategory,
    score,
  };
}

/**
 * Advance the streak when a day closes. Breaks are detected lazily: an off day
 * leaves the streak untouched, and the gap is reconciled (consuming freezes)
 * the next time a qualifying day closes — so a single missed day never erases
 * progress as long as a freeze is banked.
 */
export function closeDay(
  prev: StreakState,
  date: string,
  qualified: boolean,
  config: StreakConfig = DEFAULT_STREAK_CONFIG
): StreakState {
  if (!qualified) return prev;

  let current: number;
  let freezesAvailable = prev.freezesAvailable;

  if (!prev.lastQualifiedDate) {
    current = 1;
  } else {
    const gap = daysBetween(prev.lastQualifiedDate, date);
    if (gap <= 0) {
      // Re-closing the same day: idempotent.
      current = Math.max(prev.current, 1);
    } else if (gap === 1) {
      current = prev.current + 1;
    } else {
      const missed = gap - 1;
      if (missed <= freezesAvailable) {
        freezesAvailable -= missed; // freezes absorb the missed days
        current = prev.current + 1;
      } else {
        current = 1; // streak broke
      }
    }
  }

  // Earn a freeze on every Nth qualifying day.
  if (current > 0 && current % config.freezeEarnedEvery === 0) {
    freezesAvailable = Math.min(config.maxFreezes, freezesAvailable + 1);
  }

  return {
    current,
    longest: Math.max(prev.longest, current),
    lastQualifiedDate: date,
    freezesAvailable,
  };
}

/** Average of recent day scores → the rolling Wellness Score (0–100). */
export function rollingWellnessScore(dayScores: number[], window = 7): number {
  if (dayScores.length === 0) return 0;
  const recent = dayScores.slice(-window);
  return Math.round(recent.reduce((s, n) => s + n, 0) / recent.length);
}

/**
 * Per-category balance over recent days: the share of completed minutes each
 * category received. Useful for the Insights screen to show whether life is
 * tilting too far toward work.
 */
export function categoryBalance(
  days: DayEvaluation[]
): Record<Category, number> {
  const totals = emptyByCategory();
  for (const d of days) {
    for (const cat of CATEGORIES) totals[cat] += d.completedByCategory[cat];
  }
  const grand = CATEGORIES.reduce((s, c) => s + totals[c], 0);
  const balance = emptyByCategory();
  if (grand === 0) return balance;
  for (const cat of CATEGORIES) balance[cat] = Math.round((totals[cat] / grand) * 100);
  return balance;
}
