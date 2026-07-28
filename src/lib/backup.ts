import { applicationStages, type Application, type ApplicationEvent, type JobTrailData } from "./types";

const priorities = ["high", "medium", "low"] as const;
const eventTypes = ["created", "stage_changed", "note"] as const;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function optionalString(value: unknown) {
  return value === undefined || typeof value === "string";
}

function isApplication(value: unknown): value is Application {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.company === "string" &&
    typeof value.role === "string" &&
    applicationStages.includes(value.currentStage as Application["currentStage"]) &&
    priorities.includes(value.priority as Application["priority"]) &&
    optionalString(value.appliedAt) &&
    optionalString(value.source) &&
    optionalString(value.location) &&
    optionalString(value.salaryRange) &&
    optionalString(value.jobUrl) &&
    optionalString(value.nextAction) &&
    optionalString(value.nextActionAt) &&
    optionalString(value.notes) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isApplicationEvent(value: unknown): value is ApplicationEvent {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.applicationId === "string" &&
    eventTypes.includes(value.type as ApplicationEvent["type"]) &&
    optionalString(value.fromStage) &&
    optionalString(value.toStage) &&
    optionalString(value.content) &&
    typeof value.occurredAt === "string"
  );
}

export function parseJobTrailBackup(content: string): JobTrailData {
  const parsed = JSON.parse(content) as unknown;

  if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.applications) || !Array.isArray(parsed.events)) {
    throw new Error("Invalid JobTrail backup format");
  }

  if (!parsed.applications.every(isApplication) || !parsed.events.every(isApplicationEvent)) {
    throw new Error("Invalid JobTrail backup data");
  }

  return {
    version: 1,
    applications: parsed.applications,
    events: parsed.events,
  };
}

export function downloadJsonBackup(data: JobTrailData) {
  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `投程-数据备份-${date}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
