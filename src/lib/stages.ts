import type { ApplicationStage, Priority } from "./types";

export interface StageDefinition {
  id: ApplicationStage;
  label: string;
  shortLabel: string;
  tone: string;
  terminal?: boolean;
}

export const stageDefinitions: StageDefinition[] = [
  { id: "wishlist", label: "待投递", shortLabel: "待投递", tone: "slate" },
  { id: "applied", label: "已投递", shortLabel: "已投递", tone: "blue" },
  { id: "assessment", label: "测评 / 笔试", shortLabel: "笔试", tone: "cyan" },
  { id: "interview_ready", label: "进面", shortLabel: "进面", tone: "violet" },
  { id: "interview_1", label: "一面", shortLabel: "一面", tone: "violet" },
  { id: "interview_2", label: "二面", shortLabel: "二面", tone: "purple" },
  { id: "final_interview", label: "HR 面 / 终面", shortLabel: "终面", tone: "amber" },
  { id: "offer", label: "Offer", shortLabel: "Offer", tone: "orange" },
  { id: "accepted", label: "已接受 / 入职", shortLabel: "已入职", tone: "green", terminal: true },
  { id: "rejected", label: "已淘汰", shortLabel: "淘汰", tone: "red", terminal: true },
  { id: "rejected_resume", label: "简历挂", shortLabel: "简历挂", tone: "red", terminal: true },
  { id: "rejected_assessment", label: "笔试挂", shortLabel: "笔试挂", tone: "red", terminal: true },
  { id: "rejected_interview_1", label: "一面挂", shortLabel: "一面挂", tone: "red", terminal: true },
  { id: "rejected_interview_2", label: "二面挂", shortLabel: "二面挂", tone: "red", terminal: true },
  { id: "rejected_interview_3", label: "三面挂", shortLabel: "三面挂", tone: "red", terminal: true },
  { id: "rejected_hr", label: "HR 面挂", shortLabel: "HR 挂", tone: "red", terminal: true },
  { id: "withdrawn", label: "主动放弃", shortLabel: "放弃", tone: "gray", terminal: true },
  { id: "ghosted", label: "长期无回复", shortLabel: "无回复", tone: "gray", terminal: true },
];

export const stageMap = Object.fromEntries(
  stageDefinitions.map((stage) => [stage.id, stage]),
) as Record<ApplicationStage, StageDefinition>;

export const priorityLabels: Record<Priority, string> = {
  high: "高优先",
  medium: "中优先",
  low: "低优先",
};

export const priorityOrder: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export const rejectedStageIds: ApplicationStage[] = [
  "rejected",
  "rejected_resume",
  "rejected_assessment",
  "rejected_interview_1",
  "rejected_interview_2",
  "rejected_interview_3",
  "rejected_hr",
];

export const boardStageDefinitions = stageDefinitions.filter(
  (stage) => stage.id === "rejected" || !rejectedStageIds.includes(stage.id),
);

export function getBoardStageId(stage: ApplicationStage): ApplicationStage {
  return rejectedStageIds.includes(stage) ? "rejected" : stage;
}

export const interviewStages: ApplicationStage[] = [
  "interview_ready",
  "interview_1",
  "interview_2",
  "final_interview",
  "offer",
  "accepted",
  "rejected_interview_1",
  "rejected_interview_2",
  "rejected_interview_3",
  "rejected_hr",
];

export const offerStages: ApplicationStage[] = ["offer", "accepted"];
