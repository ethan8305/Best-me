import {
  FixedEvent,
  projectToTask,
  schedule,
} from "../scheduler";
import {
  Block,
  Category,
  DailyCheckin,
  DayPlan,
  Profile,
  Project,
} from "../types";

/** Build a full day plan from the profile, active projects, and check-in. */
export function buildDayPlan(args: {
  date: string;
  profile: Profile;
  projects: Project[];
  checkin?: DailyCheckin;
  fixedEvents?: FixedEvent[];
}): DayPlan {
  const { date, profile, projects, checkin, fixedEvents = [] } = args;

  const tasks = projects
    .filter((p) => p.status === "active")
    .map((p) => projectToTask(p, date));

  // The check-in's desired categories raise those quotas for the day.
  const quotas = { ...profile.wellness.quotas };
  for (const cat of checkin?.desiredCategories ?? []) {
    quotas[cat] = Math.max(quotas[cat] ?? 0, 30);
  }

  const result = schedule({
    date,
    dayWindow: profile.dayWindow,
    fixedEvents,
    tasks,
    peakWindows: profile.peakEnergyWindows,
    quotas,
    estimationFactors: profile.estimationFactors,
    options: { bufferMinutes: 10, minWellnessBlock: 20 },
  });

  return {
    id: `plan-${date}`,
    date,
    blocks: result.blocks,
    summary: fallbackSummary(result.minutesByCategory),
    generatedAt: new Date().toISOString(),
    status: "active",
  };
}

const LABELS: Record<Category, string> = {
  work: "focused work",
  movement: "movement",
  family: "connection",
  alone: "alone time",
  rest: "rest",
};

/** A warm, offline narrative so Today always has a brief, even without Claude. */
export function fallbackSummary(byCategory: Record<Category, number>): string {
  const present = (Object.keys(byCategory) as Category[])
    .filter((c) => byCategory[c] > 0)
    .sort((a, b) => byCategory[b] - byCategory[a]);
  if (present.length === 0) return "A blank canvas — add a goal to shape your day.";

  const workMin = byCategory.work;
  const wellness = present.filter((c) => c !== "work");
  const parts = present.map((c) => LABELS[c]).slice(0, 3).join(", ");

  const opener =
    workMin > 0
      ? `Today balances ${Math.round(workMin / 60)}h of focused work with ${parts.replace("focused work, ", "")}.`
      : `Today is yours: ${parts}.`;
  const close = wellness.length
    ? " Protect the wellbeing blocks — they're what keep the streak meaningful."
    : " Add a little movement or rest to keep the day balanced.";
  return opener + close;
}

/** Total estimated minutes per category for a set of blocks. */
export function minutesByCategory(blocks: Block[]): Record<Category, number> {
  const out: Record<Category, number> = {
    work: 0,
    movement: 0,
    family: 0,
    alone: 0,
    rest: 0,
  };
  for (const b of blocks) out[b.category] += b.estimatedMinutes;
  return out;
}
