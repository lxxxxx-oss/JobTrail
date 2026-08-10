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

export class LocalStorageApplicationRepository implements ApplicationRepository {
  async load(): Promise<JobTrailData> {
    if (typeof window === "undefined") return emptyData;

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData;

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
