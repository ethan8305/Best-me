import { durationOf } from "./intervals";
import {
  ScheduleInput,
  SchedulableTask,
  daysUntil,
  projectToTask,
  schedule,
  spacedDailyTarget,
} from "./scheduler";
import { Project } from "../types";

const baseInput = (over: Partial<ScheduleInput> = {}): ScheduleInput => ({
  date: "2026-06-27",
  dayWindow: { start: 420, end: 1380 }, // 07:00–23:00
  fixedEvents: [],
  tasks: [],
  peakWindows: [{ start: 480, end: 720 }], // 08:00–12:00
  quotas: {},
  estimationFactors: {},
  ...over,
});

const task = (over: Partial<SchedulableTask> = {}): SchedulableTask => ({
  id: "t1",
  title: "Task",
  category: "work",
  estimatedMinutes: 60,
  priority: "medium",
  ...over,
});

const overlaps = (a: { start: number; end: number }, b: { start: number; end: number }) =>
  a.start < b.end && b.start < a.end;

describe("daysUntil / spacedDailyTarget", () => {
  it("counts whole days between ISO dates", () => {
    expect(daysUntil("2026-06-30", "2026-06-27")).toBe(3);
    expect(daysUntil("2026-06-27", "2026-06-27")).toBe(0);
    expect(daysUntil("2026-06-20", "2026-06-27")).toBe(0); // never negative
  });

  it("spreads effort instead of cramming", () => {
    // 300 min over 4 days left → 60/day, not 300 today.
    expect(spacedDailyTarget(300, 4)).toBe(60);
    // On the deadline day, schedule the remainder.
    expect(spacedDailyTarget(45, 0)).toBe(45);
    expect(spacedDailyTarget(0, 3)).toBe(0);
  });
});

describe("schedule", () => {
  it("never overlaps fixed calendar events", () => {
    const fixed = [
      { title: "Standup", start: 540, end: 600, category: "work" as const },
      { title: "Lunch w/ family", start: 720, end: 780, category: "family" as const },
    ];
    const result = schedule(
      baseInput({
        fixedEvents: fixed,
        tasks: [task({ estimatedMinutes: 240, splittable: true, minChunkMinutes: 30 })],
      })
    );
    const placed = result.blocks.filter((b) => b.source === "ai");
    for (const p of placed) {
      for (const f of fixed) {
        expect(overlaps(p, f)).toBe(false);
      }
    }
    // Fixed events are represented as immovable blocks.
    expect(result.blocks.filter((b) => b.fixed)).toHaveLength(2);
  });

  it("places focus work inside a peak-energy window", () => {
    const result = schedule(
      baseInput({
        tasks: [task({ focus: true, estimatedMinutes: 120 })],
      })
    );
    const work = result.blocks.find((b) => b.id === "t1")!;
    expect(work).toBeDefined();
    // Starts within the 08:00–12:00 peak window.
    expect(work.start).toBeGreaterThanOrEqual(480);
    expect(work.end).toBeLessThanOrEqual(720);
  });

  it("applies the learned estimation factor to durations", () => {
    const result = schedule(
      baseInput({
        tasks: [task({ estimatedMinutes: 60 })],
        estimationFactors: { work: 1.5 },
      })
    );
    const work = result.blocks.find((b) => b.id === "t1")!;
    expect(durationOf(work)).toBe(90);
  });

  it("backfills wellness categories to meet quotas", () => {
    const result = schedule(
      baseInput({
        quotas: { movement: 30, alone: 40 },
      })
    );
    expect(result.minutesByCategory.movement).toBeGreaterThanOrEqual(30);
    expect(result.minutesByCategory.alone).toBeGreaterThanOrEqual(40);
    expect(result.quotaShortfall.movement).toBe(0);
    expect(result.blocks.some((b) => b.category === "movement")).toBe(true);
  });

  it("reports tasks that do not fit", () => {
    const result = schedule(
      baseInput({
        dayWindow: { start: 420, end: 480 }, // only 60 min
        tasks: [task({ estimatedMinutes: 120 })],
      })
    );
    expect(result.blocks.filter((b) => b.source === "ai")).toHaveLength(0);
    expect(result.unplaced).toHaveLength(1);
    expect(result.unplaced[0].reason).toBe("no-room");
    expect(result.unplaced[0].remainingMinutes).toBe(120);
  });

  it("only schedules after `now` on a mid-day re-plan", () => {
    const result = schedule(
      baseInput({
        now: 600, // 10:00
        tasks: [task({ estimatedMinutes: 60 })],
      })
    );
    for (const b of result.blocks.filter((b) => b.source === "ai")) {
      expect(b.start).toBeGreaterThanOrEqual(600);
    }
  });

  it("schedules higher-priority work earlier", () => {
    const result = schedule(
      baseInput({
        tasks: [
          task({ id: "low", priority: "low", estimatedMinutes: 60 }),
          task({ id: "high", priority: "high", estimatedMinutes: 60 }),
        ],
      })
    );
    const high = result.blocks.find((b) => b.id === "high")!;
    const low = result.blocks.find((b) => b.id === "low")!;
    expect(high.start).toBeLessThan(low.start);
  });
});

describe("projectToTask", () => {
  it("derives today's chunk from spaced effort", () => {
    const project: Project = {
      id: "p1",
      title: "Ship v1",
      category: "work",
      deadline: "2026-07-01",
      estimatedEffortMinutes: 600,
      completedMinutes: 120,
      priority: "high",
      status: "active",
    };
    const t = projectToTask(project, "2026-06-27"); // 4 days left, 480 remaining
    expect(t.estimatedMinutes).toBe(spacedDailyTarget(480, 4)); // 96
    expect(t.projectId).toBe("p1");
    expect(t.focus).toBe(true);
    expect(t.splittable).toBe(true);
  });
});
