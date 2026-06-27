import { create } from "zustand";

import {
  seedDailyScores,
  seedGoals,
  seedProfile,
  seedProjects,
  seedStreak,
} from "../data/seed";
import { buildDayPlan } from "../lib/plan";
import { todayIso } from "../lib/time";
import {
  closeDay,
  evaluateDay,
  rollingWellnessScore,
} from "../streak";
import {
  BlockStatus,
  Category,
  DailyCheckin,
  DayPlan,
  Goal,
  Profile,
  Project,
  StreakState,
} from "../types";

interface OnboardingInput {
  name: string;
  summary: string;
  dayWindow: { start: number; end: number };
  desiredCategories: Category[];
}

interface AppState {
  onboarded: boolean;
  profile: Profile;
  goals: Goal[];
  projects: Project[];
  checkin?: DailyCheckin;
  plan?: DayPlan;
  streak: StreakState;
  dailyScores: number[];

  // selectors
  wellnessScore: () => number;

  // actions
  completeOnboarding: (input: OnboardingInput) => void;
  exploreWithSeed: () => void;
  setCheckin: (checkin: DailyCheckin) => void;
  regeneratePlan: () => void;
  setBlockStatus: (blockId: string, status: BlockStatus, actualMinutes?: number) => void;
  closeToday: () => { qualified: boolean; score: number };
}

export const useAppStore = create<AppState>((set, get) => ({
  onboarded: false,
  profile: seedProfile,
  goals: seedGoals,
  projects: seedProjects,
  streak: seedStreak,
  dailyScores: seedDailyScores,
  plan: undefined,

  wellnessScore: () => rollingWellnessScore(get().dailyScores),

  completeOnboarding: (input) => {
    const profile: Profile = {
      ...seedProfile,
      name: input.name || "You",
      onboardingSummary: input.summary,
      dayWindow: input.dayWindow,
    };
    const date = todayIso();
    const checkin: DailyCheckin = {
      date,
      energy: 3,
      mood: 3,
      hoursAvailableMinutes: input.dayWindow.end - input.dayWindow.start,
      desiredCategories: input.desiredCategories,
    };
    const plan = buildDayPlan({ date, profile, projects: get().projects, checkin });
    set({ onboarded: true, profile, checkin, plan });
  },

  exploreWithSeed: () => {
    const date = todayIso();
    const checkin: DailyCheckin = {
      date,
      energy: 4,
      mood: 4,
      hoursAvailableMinutes: seedProfile.dayWindow.end - seedProfile.dayWindow.start,
      desiredCategories: ["movement", "family", "rest"],
    };
    const plan = buildDayPlan({
      date,
      profile: seedProfile,
      projects: seedProjects,
      checkin,
    });
    set({ onboarded: true, checkin, plan });
  },

  setCheckin: (checkin) => {
    set({ checkin });
    get().regeneratePlan();
  },

  regeneratePlan: () => {
    const { profile, projects, checkin } = get();
    const date = checkin?.date ?? todayIso();
    set({ plan: buildDayPlan({ date, profile, projects, checkin }) });
  },

  setBlockStatus: (blockId, status, actualMinutes) => {
    const plan = get().plan;
    if (!plan) return;
    set({
      plan: {
        ...plan,
        blocks: plan.blocks.map((b) =>
          b.id === blockId ? { ...b, status, actualMinutes } : b
        ),
      },
    });
  },

  closeToday: () => {
    const { plan, streak, dailyScores } = get();
    const date = plan?.date ?? todayIso();
    const evaluation = evaluateDay(date, plan?.blocks ?? []);
    const nextStreak = closeDay(streak, date, evaluation.qualified);
    set({
      streak: nextStreak,
      dailyScores: [...dailyScores, evaluation.score],
      plan: plan ? { ...plan, status: "closed" } : plan,
    });
    return { qualified: evaluation.qualified, score: evaluation.score };
  },
}));
