import type { SupabaseClient } from "@supabase/supabase-js";
import type { Application, ApplicationEvent } from "./types";
import type { JobTrailData } from "./types";

export interface ApplicationRepository {
  load(): Promise<JobTrailData>;
  save(data: JobTrailData): Promise<void>;
}

export const STORAGE_KEY = "jobtrail:data:v1";

export const emptyData: JobTrailData = {
  version: 1,
  applications: [],
  events: [],
};

type ApplicationRow = {
  id: string;
  user_id: string;
  company: string;
  role: string;
  current_stage: Application["currentStage"];
  applied_at: string | null;
  source: string | null;
  location: string | null;
  salary_range: string | null;
  job_url: string | null;
  priority: Application["priority"];
  next_action: string | null;
  next_action_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type ApplicationEventRow = {
  id: string;
  user_id: string;
  application_id: string;
  type: ApplicationEvent["type"];
  from_stage: ApplicationEvent["fromStage"] | null;
  to_stage: ApplicationEvent["toStage"] | null;
  content: string | null;
  occurred_at: string;
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
  async load(): Promise<JobTrailData> {
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

  async save(data: JobTrailData): Promise<void> {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}

export class SupabaseApplicationRepository implements ApplicationRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly userId: string,
  ) {}

  async load(): Promise<JobTrailData> {
    const [applicationsResult, eventsResult] = await Promise.all([
      this.supabase
        .from("applications")
        .select("*")
        .eq("user_id", this.userId)
        .order("updated_at", { ascending: false }),
      this.supabase
        .from("application_events")
        .select("*")
        .eq("user_id", this.userId)
        .order("occurred_at", { ascending: false }),
    ]);

    if (applicationsResult.error) throw applicationsResult.error;
    if (eventsResult.error) throw eventsResult.error;

    return {
      version: 1,
      applications: ((applicationsResult.data ?? []) as ApplicationRow[]).map(applicationFromRow),
      events: ((eventsResult.data ?? []) as ApplicationEventRow[]).map(eventFromRow),
    };
  }

  async save(data: JobTrailData): Promise<void> {
    const applicationRows = data.applications.map((application) => applicationToRow(application, this.userId));
    const eventRows = data.events.map((event) => eventToRow(event, this.userId));

    if (applicationRows.length) {
      await assertSupabase(
        this.supabase.from("applications").upsert(applicationRows, { onConflict: "id" }),
      );
      await assertSupabase(
        this.supabase
          .from("applications")
          .delete()
          .eq("user_id", this.userId)
          .not("id", "in", `(${applicationRows.map((row) => row.id).join(",")})`),
      );
    } else {
      await assertSupabase(this.supabase.from("applications").delete().eq("user_id", this.userId));
    }

    if (eventRows.length) {
      await assertSupabase(
        this.supabase.from("application_events").upsert(eventRows, { onConflict: "id" }),
      );
      await assertSupabase(
        this.supabase
          .from("application_events")
          .delete()
          .eq("user_id", this.userId)
          .not("id", "in", `(${eventRows.map((row) => row.id).join(",")})`),
      );
    } else {
      await assertSupabase(this.supabase.from("application_events").delete().eq("user_id", this.userId));
    }
  }
}

async function assertSupabase<T>(request: PromiseLike<{ error: unknown; data: T }>) {
  const result = await request;
  if (result.error) throw result.error;
  return result.data;
}

function applicationToRow(application: Application, userId: string): ApplicationRow {
  return {
    id: application.id,
    user_id: userId,
    company: application.company,
    role: application.role,
    current_stage: application.currentStage,
    applied_at: application.appliedAt ?? null,
    source: application.source ?? null,
    location: application.location ?? null,
    salary_range: application.salaryRange ?? null,
    job_url: application.jobUrl ?? null,
    priority: application.priority,
    next_action: application.nextAction ?? null,
    next_action_at: application.nextActionAt ?? null,
    notes: application.notes ?? null,
    created_at: application.createdAt,
    updated_at: application.updatedAt,
  };
}

function applicationFromRow(row: ApplicationRow): Application {
  return {
    id: row.id,
    company: row.company,
    role: row.role,
    currentStage: row.current_stage,
    appliedAt: row.applied_at ?? undefined,
    source: row.source ?? undefined,
    location: row.location ?? undefined,
    salaryRange: row.salary_range ?? undefined,
    jobUrl: row.job_url ?? undefined,
    priority: row.priority,
    nextAction: row.next_action ?? undefined,
    nextActionAt: row.next_action_at ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function eventToRow(event: ApplicationEvent, userId: string): ApplicationEventRow {
  return {
    id: event.id,
    user_id: userId,
    application_id: event.applicationId,
    type: event.type,
    from_stage: event.fromStage ?? null,
    to_stage: event.toStage ?? null,
    content: event.content ?? null,
    occurred_at: event.occurredAt,
  };
}

function eventFromRow(row: ApplicationEventRow): ApplicationEvent {
  return {
    id: row.id,
    applicationId: row.application_id,
    type: row.type,
    fromStage: row.from_stage ?? undefined,
    toStage: row.to_stage ?? undefined,
    content: row.content ?? undefined,
    occurredAt: row.occurred_at,
  };
}
