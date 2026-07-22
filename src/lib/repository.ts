import type { JobTrailData } from "./types";

export interface ApplicationRepository {
  load(): JobTrailData;
  save(data: JobTrailData): void;
}

export const STORAGE_KEY = "jobtrail:data:v1";

const emptyData: JobTrailData = {
  version: 1,
  applications: [],
  events: [],
};

function isoDaysFrom(now: Date, days: number, hour = 9) {
  const date = new Date(now);
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

function dateDaysFrom(now: Date, days: number) {
  return isoDaysFrom(now, days).slice(0, 10);
}

export function createDefaultData(now = new Date()): JobTrailData {
  const firstApplicationId = "demo-application-tencent";
  const secondApplicationId = "demo-application-xiaohongshu";
  const firstCreatedAt = isoDaysFrom(now, -8);
  const firstUpdatedAt = isoDaysFrom(now, -1, 16);
  const secondCreatedAt = isoDaysFrom(now, -3);

  return {
    version: 1,
    applications: [
      {
        id: firstApplicationId,
        company: "腾讯",
        role: "前端开发工程师",
        currentStage: "interview_1",
        appliedAt: dateDaysFrom(now, -8),
        source: "官网投递",
        location: "深圳",
        salaryRange: "25k–35k",
        priority: "high",
        nextAction: "准备一面：复习项目难点",
        nextActionAt: isoDaysFrom(now, 1, 10),
        notes: "重点准备性能优化和工程化相关问题。",
        createdAt: firstCreatedAt,
        updatedAt: firstUpdatedAt,
      },
      {
        id: secondApplicationId,
        company: "小红书",
        role: "产品经理",
        currentStage: "applied",
        appliedAt: dateDaysFrom(now, -3),
        source: "内推",
        location: "上海",
        salaryRange: "20k–30k",
        priority: "medium",
        nextAction: "联系内推人确认简历进度",
        nextActionAt: isoDaysFrom(now, 3, 14),
        notes: "关注社区增长和内容生态方向。",
        createdAt: secondCreatedAt,
        updatedAt: secondCreatedAt,
      },
    ],
    events: [
      {
        id: "demo-event-tencent-interview",
        applicationId: firstApplicationId,
        type: "stage_changed",
        fromStage: "interview_ready",
        toStage: "interview_1",
        occurredAt: firstUpdatedAt,
      },
      {
        id: "demo-event-tencent-created",
        applicationId: firstApplicationId,
        type: "created",
        toStage: "applied",
        occurredAt: firstCreatedAt,
      },
      {
        id: "demo-event-xiaohongshu-created",
        applicationId: secondApplicationId,
        type: "created",
        toStage: "applied",
        occurredAt: secondCreatedAt,
      },
    ],
  };
}

export class LocalStorageApplicationRepository implements ApplicationRepository {
  load(): JobTrailData {
    if (typeof window === "undefined") return emptyData;

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultData();

    try {
      const parsed = JSON.parse(raw) as JobTrailData;
      if (parsed.version !== 1 || !Array.isArray(parsed.applications) || !Array.isArray(parsed.events)) {
        return emptyData;
      }
      return parsed;
    } catch {
      return emptyData;
    }
  }

  save(data: JobTrailData): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}
