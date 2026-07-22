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

export const interviewStages: ApplicationStage[] = [
  "interview_ready",
  "interview_1",
  "interview_2",
  "final_interview",
  "offer",
  "accepted",
];

export const offerStages: ApplicationStage[] = ["offer", "accepted"];
