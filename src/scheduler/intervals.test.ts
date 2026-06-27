import {
  clampToWindow,
  freeIntervals,
  mergeIntervals,
  totalMinutes,
} from "./intervals";

describe("mergeIntervals", () => {
  it("merges overlapping and touching intervals", () => {
    const merged = mergeIntervals([
      { start: 60, end: 120 },
      { start: 100, end: 180 },
      { start: 180, end: 200 },
      { start: 300, end: 360 },
    ]);
    expect(merged).toEqual([
      { start: 60, end: 200 },
      { start: 300, end: 360 },
    ]);
  });

  it("drops zero/negative-length intervals", () => {
    expect(mergeIntervals([{ start: 100, end: 100 }])).toEqual([]);
  });
});

describe("clampToWindow", () => {
  it("clamps to window bounds", () => {
    expect(clampToWindow({ start: 0, end: 500 }, { start: 100, end: 400 })).toEqual({
      start: 100,
      end: 400,
    });
  });

  it("returns null when outside the window", () => {
    expect(clampToWindow({ start: 0, end: 50 }, { start: 100, end: 400 })).toBeNull();
  });
});

describe("freeIntervals", () => {
  const window = { start: 420, end: 1380 }; // 07:00–23:00

  it("returns the whole window when nothing is busy", () => {
    expect(freeIntervals(window, [])).toEqual([window]);
  });

  it("carves out fixed events", () => {
    const free = freeIntervals(window, [
      { start: 540, end: 600 }, // 09:00–10:00
      { start: 720, end: 780 }, // 12:00–13:00
    ]);
    expect(free).toEqual([
      { start: 420, end: 540 },
      { start: 600, end: 720 },
      { start: 780, end: 1380 },
    ]);
  });

  it("handles events spanning the window edges", () => {
    const free = freeIntervals(window, [{ start: 0, end: 480 }]);
    expect(free).toEqual([{ start: 480, end: 1380 }]);
  });

  it("conserves time: free + busy === window", () => {
    const busy = [
      { start: 540, end: 600 },
      { start: 720, end: 780 },
    ];
    const free = freeIntervals(window, busy);
    expect(totalMinutes(free) + totalMinutes(busy)).toBe(window.end - window.start);
  });
});
