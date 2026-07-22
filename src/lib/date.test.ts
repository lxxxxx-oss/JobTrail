import { describe, expect, it } from "vitest";
import { getTaskTiming, toDateTimeLocal } from "./date";

describe("getTaskTiming", () => {
  const now = new Date(2026, 6, 22, 12, 0);

  it("区分逾期、今天、未来七天和更晚", () => {
    expect(getTaskTiming(new Date(2026, 6, 21, 23, 0).toISOString(), now)).toBe("overdue");
    expect(getTaskTiming(new Date(2026, 6, 22, 18, 0).toISOString(), now)).toBe("today");
    expect(getTaskTiming(new Date(2026, 6, 27, 9, 0).toISOString(), now)).toBe("upcoming");
    expect(getTaskTiming(new Date(2026, 7, 5, 9, 0).toISOString(), now)).toBe("later");
  });
});

describe("toDateTimeLocal", () => {
  it("为空值返回空字符串", () => {
    expect(toDateTimeLocal()).toBe("");
  });

  it("输出 datetime-local 可使用的格式", () => {
    expect(toDateTimeLocal("2026-07-22T10:30:00.000Z")).toMatch(/^2026-07-22T\d{2}:30$/);
  });
});
