import { Block, StreakState } from "../types";
import {
  DEFAULT_STREAK_CONFIG,
  categoryBalance,
  closeDay,
  daysBetween,
  evaluateDay,
  rollingWellnessScore,
} from "./streak";

let seq = 0;
const block = (over: Partial<Block>): Block => ({
  id: `b${seq++}`,
  title: "Block",
  category: "work",
  start: 540,
  end: 600,
  estimatedMinutes: 60,
  source: "ai",
  status: "planned",
  ...over,
});

const done = (over: Partial<Block>): Block =>
  block({ status: "done", ...over });

const fresh: StreakState = {
  current: 0,
  longest: 0,
  freezesAvailable: 0,
};

describe("daysBetween", () => {
  it("counts whole days", () => {
    expect(daysBetween("2026-06-25", "2026-06-27")).toBe(2);
    expect(daysBetween("2026-06-27", "2026-06-27")).toBe(0);
  });
});

describe("evaluateDay (balanced-day rule)", () => {
  it("qualifies when work is honored AND a wellness need is met", () => {
    const e = evaluateDay("2026-06-27", [
      done({ category: "work", estimatedMinutes: 120, actualMinutes: 120 }),
      done({ category: "movement", estimatedMinutes: 30, actualMinutes: 30 }),
    ]);
    expect(e.workSatisfied).toBe(true);
    expect(e.honoredWellness).toContain("movement");
    expect(e.qualified).toBe(true);
  });

  it("does NOT qualify on work alone (no wellness = grind)", () => {
    const e = evaluateDay("2026-06-27", [
      done({ category: "work", estimatedMinutes: 240, actualMinutes: 240 }),
    ]);
    expect(e.qualified).toBe(false);
  });

  it("does NOT qualify when work was dropped", () => {
    const e = evaluateDay("2026-06-27", [
      block({ category: "work", estimatedMinutes: 120, status: "skipped" }),
      done({ category: "movement", estimatedMinutes: 30, actualMinutes: 30 }),
    ]);
    expect(e.workSatisfied).toBe(false);
    expect(e.qualified).toBe(false);
  });

  it("treats a no-work day as work-satisfied (rest days count)", () => {
    const e = evaluateDay("2026-06-27", [
      done({ category: "family", estimatedMinutes: 90, actualMinutes: 90 }),
    ]);
    expect(e.workSatisfied).toBe(true);
    expect(e.qualified).toBe(true);
  });

  it("scores breadth + work completion", () => {
    const e = evaluateDay("2026-06-27", [
      done({ category: "work", estimatedMinutes: 100, actualMinutes: 100 }),
      done({ category: "movement", estimatedMinutes: 30, actualMinutes: 30 }),
      done({ category: "family", estimatedMinutes: 60, actualMinutes: 60 }),
    ]);
    // breadth 2/4 = .5 → 0.6*.5=.3 ; work 1 → 0.4 ; total .7 → 70
    expect(e.score).toBe(70);
  });
});

describe("closeDay", () => {
  const cfg = DEFAULT_STREAK_CONFIG;

  it("starts the streak at 1", () => {
    const s = closeDay(fresh, "2026-06-27", true, cfg);
    expect(s.current).toBe(1);
    expect(s.longest).toBe(1);
    expect(s.lastQualifiedDate).toBe("2026-06-27");
  });

  it("increments on consecutive qualifying days", () => {
    const prev: StreakState = {
      current: 3,
      longest: 3,
      lastQualifiedDate: "2026-06-26",
      freezesAvailable: 0,
    };
    const s = closeDay(prev, "2026-06-27", true, cfg);
    expect(s.current).toBe(4);
    expect(s.longest).toBe(4);
  });

  it("leaves the streak untouched on an off day", () => {
    const prev: StreakState = {
      current: 5,
      longest: 5,
      lastQualifiedDate: "2026-06-26",
      freezesAvailable: 1,
    };
    expect(closeDay(prev, "2026-06-27", false, cfg)).toEqual(prev);
  });

  it("spends a freeze to survive a missed day", () => {
    const prev: StreakState = {
      current: 5,
      longest: 5,
      lastQualifiedDate: "2026-06-25", // gap of 2 → 1 missed day
      freezesAvailable: 1,
    };
    const s = closeDay(prev, "2026-06-27", true, cfg);
    expect(s.current).toBe(6);
    expect(s.freezesAvailable).toBe(0);
  });

  it("resets when there is no freeze to cover the gap", () => {
    const prev: StreakState = {
      current: 5,
      longest: 5,
      lastQualifiedDate: "2026-06-25",
      freezesAvailable: 0,
    };
    const s = closeDay(prev, "2026-06-27", true, cfg);
    expect(s.current).toBe(1);
    expect(s.longest).toBe(5); // longest preserved
  });

  it("earns a freeze every 7 qualifying days", () => {
    const prev: StreakState = {
      current: 6,
      longest: 6,
      lastQualifiedDate: "2026-06-26",
      freezesAvailable: 0,
    };
    const s = closeDay(prev, "2026-06-27", true, cfg);
    expect(s.current).toBe(7);
    expect(s.freezesAvailable).toBe(1);
  });
});

describe("wellness aggregates", () => {
  it("averages recent day scores", () => {
    expect(rollingWellnessScore([60, 80, 100])).toBe(80);
    expect(rollingWellnessScore([])).toBe(0);
  });

  it("computes category balance shares", () => {
    const balance = categoryBalance([
      evaluateDay("2026-06-27", [
        done({ category: "work", estimatedMinutes: 60, actualMinutes: 60 }),
        done({ category: "rest", estimatedMinutes: 60, actualMinutes: 60 }),
      ]),
    ]);
    expect(balance.work).toBe(50);
    expect(balance.rest).toBe(50);
  });
});
