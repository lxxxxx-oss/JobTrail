import { describe, expect, it, vi } from "vitest";
import { calculateMetrics } from "./metrics";
import type { Application, ApplicationEvent } from "./types";

const baseApplication: Application = {
  id: "base",
  company: "示例公司",
  role: "产品经理",
  currentStage: "applied",
  priority: "medium",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

describe("calculateMetrics", () => {
  it("待投递不计入累计投递", () => {
    const applications = [baseApplication, { ...baseApplication, id: "wish", currentStage: "wishlist" as const }];
    expect(calculateMetrics(applications, []).submitted).toBe(1);
  });

  it("通过历史事件计算曾经进面和获得 Offer 的记录", () => {
    const applications = [{ ...baseApplication, currentStage: "rejected" as const }];
    const events: ApplicationEvent[] = [
      {
        id: "event-1",
        applicationId: "base",
        type: "stage_changed",
        fromStage: "final_interview",
        toStage: "offer",
        occurredAt: "2026-07-10T00:00:00.000Z",
      },
    ];
    const metrics = calculateMetrics(applications, events);
    expect(metrics.interviewCount).toBe(1);
    expect(metrics.offerCount).toBe(1);
    expect(metrics.interviewRate).toBe(100);
    expect(metrics.offerRate).toBe(100);
  });

  it("统计带日期的近期待办", () => {
    vi.setSystemTime(new Date("2026-07-22T00:00:00.000Z"));
    const applications = [{ ...baseApplication, nextAction: "跟进 HR", nextActionAt: "2026-07-23T09:00:00.000Z" }];
    expect(calculateMetrics(applications, []).pendingTasks).toBe(1);
    vi.useRealTimers();
  });
});
