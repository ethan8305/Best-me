import { todayIso } from "../lib/time";
import { Goal, Profile, Project, StreakState } from "../types";

/** A ready-to-explore profile so the app runs end-to-end offline. */
export const seedProfile: Profile = {
  id: "seed-user",
  name: "You",
  timezone: "UTC",
  onboardingSummary:
    "Ship the app, stay healthy, and protect time with family in the evenings.",
  dayWindow: { start: 420, end: 1320 }, // 07:00–22:00
  peakEnergyWindows: [
    { start: 480, end: 720 }, // 08:00–12:00
    { start: 840, end: 1020 }, // 14:00–17:00
  ],
  wellness: {
    quotas: { work: 0, movement: 45, family: 60, alone: 30, rest: 30 },
    nonNegotiables: ["movement", "family"],
  },
  estimationFactors: { work: 1, movement: 1, family: 1, alone: 1, rest: 1 },
};

const today = todayIso();

export const seedGoals: Goal[] = [
  {
    id: "goal-ship",
    title: "Launch Best me v1",
    description: "Get the MVP into TestFlight.",
    category: "work",
    priority: "high",
    status: "active",
  },
  {
    id: "goal-health",
    title: "Move every day",
    description: "Build a sustainable movement habit.",
    category: "movement",
    priority: "medium",
    status: "active",
  },
];

const inDays = (n: number) => {
  const d = new Date(`${today}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export const seedProjects: Project[] = [
  {
    id: "proj-build",
    goalId: "goal-ship",
    title: "Build onboarding + Today screen",
    category: "work",
    deadline: inDays(5),
    estimatedEffortMinutes: 600,
    completedMinutes: 120,
    priority: "high",
    status: "active",
  },
  {
    id: "proj-review",
    goalId: "goal-ship",
    title: "Polish & QA pass",
    category: "work",
    deadline: inDays(9),
    estimatedEffortMinutes: 300,
    completedMinutes: 0,
    priority: "medium",
    status: "active",
  },
];

export const seedStreak: StreakState = {
  current: 3,
  longest: 7,
  lastQualifiedDate: inDays(-1),
  freezesAvailable: 1,
};

export const seedDailyScores = [55, 70, 80, 65, 90];
