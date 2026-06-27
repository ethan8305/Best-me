import { clock, dateFromMinutes, isoDate, minutesFromMidnight } from "./time";

describe("time helpers", () => {
  it("round-trips minutes ↔ Date for a day", () => {
    const d = dateFromMinutes("2026-06-27", 9 * 60 + 30); // 09:30
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(30);
    expect(minutesFromMidnight(d)).toBe(570);
    expect(isoDate(d)).toBe("2026-06-27");
  });

  it("formats a clock label", () => {
    expect(clock(570)).toBe("09:30");
    expect(clock(0)).toBe("00:00");
    expect(clock(23 * 60 + 5)).toBe("23:05");
  });
});
