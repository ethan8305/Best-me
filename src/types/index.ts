/**
 * Core domain models for Best me.
 *
 * Times inside the scheduler are represented as "minutes from local midnight"
 * (integers, 0–1439) so the placement logic stays pure and deterministic.
 * Conversion to/from real Date/ISO values happens at the calendar + storage
 * boundary (see src/lib/calendar and src/lib/time).
 */

/** The five life categories Best me balances a day across. */
export type Category = "work" | "movement" | "family" | "alone" | "rest";

export const CATEGORIES: Category[] = [
  "work",
  "movement",
  "family",
  "alone",
  "rest",
];

/** Categories that count as "wellness" for the balanced-day streak rule. */
export const WELLNESS_CATEGORIES: Category[] = ["movement", "family", "alone", "rest"];

export type Priority = "low" | "medium" | "high";

export type BlockStatus = "planned" | "done" | "skipped";

export type BlockSource = "ai" | "manual" | "calendar";

export interface Goal {
  id: string;
  title: string;
  description?: string;
  category: Category;
  priority: Priority;
  targetDate?: string; // ISO date
  status: "active" | "paused" | "done";
}

export interface Project {
  id: string;
  goalId?: string;
  title: string;
  category: Category;
  /** Hard deadline (ISO date). */
  deadline: string;
  /** Total remaining effort in minutes to reach the deadline. */
  estimatedEffortMinutes: number;
  /** Effort already logged, in minutes. */
  completedMinutes: number;
  priority: Priority;
  status: "active" | "paused" | "done";
}

/** The quick morning questionnaire. */
export interface DailyCheckin {
  date: string; // ISO date
  /** 1–5 self-rated energy. Drives deep-work placement. */
  energy: number;
  /** 1–5 self-rated mood. */
  mood: number;
  /** Minutes the user actually has available today. */
  hoursAvailableMinutes: number;
  /** Categories the user explicitly wants to honor today. */
  desiredCategories: Category[];
}

/** A peak-energy window (minutes from midnight) where focus work is preferred. */
export interface EnergyWindow {
  start: number;
  end: number;
}

export interface WellnessPrefs {
  /** Minimum minutes the user wants per category on a normal day. */
  quotas: Record<Category, number>;
  /** Categories the user treats as non-negotiable. */
  nonNegotiables: Category[];
}

export interface Profile {
  id: string;
  name: string;
  timezone: string;
  onboardingSummary?: string;
  /** When the user is awake/available (minutes from midnight). */
  dayWindow: { start: number; end: number };
  peakEnergyWindows: EnergyWindow[];
  wellness: WellnessPrefs;
  /**
   * Per-category learned multiplier applied to estimates. 1.0 = neutral.
   * >1 means the user consistently underestimates that category, so the
   * scheduler reserves more time. Updated nightly from reflections.
   */
  estimationFactors: Record<Category, number>;
}

/** A scheduled span of the day. */
export interface Block {
  id: string;
  title: string;
  category: Category;
  /** Minutes from midnight. */
  start: number;
  end: number;
  estimatedMinutes: number;
  actualMinutes?: number;
  source: BlockSource;
  status: BlockStatus;
  goalId?: string;
  projectId?: string;
  /** Set when this block mirrors / was written to a calendar event. */
  calendarEventId?: string;
  /** True for fixed calendar events the scheduler must plan around. */
  fixed?: boolean;
}

export interface DayPlan {
  id: string;
  date: string; // ISO date
  /** Claude-generated motivating narrative. */
  summary?: string;
  blocks: Block[];
  generatedAt: string; // ISO datetime
  status: "draft" | "active" | "closed";
}

/** Per-block rating captured in the evening reflection. */
export interface BlockRating {
  blockId: string;
  category: Category;
  completed: boolean;
  actualMinutes?: number;
  /** 1–5 how it felt / how well it went. */
  rating?: number;
}

export interface Reflection {
  date: string; // ISO date
  mood: number;
  energy: number;
  blockRatings: BlockRating[];
  notes?: string;
}

export interface StreakState {
  current: number;
  longest: number;
  /** ISO date of the last day that qualified. */
  lastQualifiedDate?: string;
  /** Remaining freezes that protect the streak on an off day. */
  freezesAvailable: number;
}
