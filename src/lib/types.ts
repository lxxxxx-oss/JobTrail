export const applicationStages = [
  "wishlist",
  "applied",
  "assessment",
  "interview_ready",
  "interview_1",
  "interview_2",
  "final_interview",
  "offer",
  "accepted",
  "rejected",
  "rejected_resume",
  "rejected_assessment",
  "rejected_interview_1",
  "rejected_interview_2",
  "rejected_interview_3",
  "rejected_hr",
  "withdrawn",
  "ghosted",
] as const;

export type ApplicationStage = (typeof applicationStages)[number];
export type Priority = "high" | "medium" | "low";

export interface Application {
  id: string;
  company: string;
  role: string;
  currentStage: ApplicationStage;
  appliedAt?: string;
  source?: string;
  location?: string;
  salaryRange?: string;
  jobUrl?: string;
  priority: Priority;
  nextAction?: string;
  nextActionAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationEvent {
  id: string;
  applicationId: string;
  type: "created" | "stage_changed" | "note";
  fromStage?: ApplicationStage;
  toStage?: ApplicationStage;
  content?: string;
  occurredAt: string;
}

export interface JobTrailData {
  version: 1;
  applications: Application[];
  events: ApplicationEvent[];
}

export type ApplicationInput = Omit<Application, "id" | "createdAt" | "updatedAt">;
