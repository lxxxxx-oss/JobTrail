import { priorityLabels, stageMap } from "./stages";
import type { Application, ApplicationEvent } from "./types";

const eventTypeLabels: Record<ApplicationEvent["type"], string> = {
  created: "创建记录",
  stage_changed: "阶段变更",
  note: "补充记录",
};

function formatDateTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return safeCell(value);
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function safeCell(value?: string) {
  if (!value) return "";
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function stageLabel(stage?: Application["currentStage"]) {
  return stage ? stageMap[stage]?.label ?? stage : "";
}

function buildFileName() {
  const date = new Date().toISOString().slice(0, 10);
  return `投程-投递记录-${date}.xlsx`;
}

export async function exportApplicationsToExcel(
  applications: Application[],
  events: ApplicationEvent[],
) {
  const XLSX = await import("xlsx");
  const applicationsById = new Map(applications.map((application) => [application.id, application]));
  const applicationRows = [...applications]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((application) => ({
      公司: safeCell(application.company),
      岗位: safeCell(application.role),
      当前阶段: stageLabel(application.currentStage),
      优先级: priorityLabels[application.priority],
      投递日期: safeCell(application.appliedAt),
      投递渠道: safeCell(application.source),
      工作地点: safeCell(application.location),
      薪资范围: safeCell(application.salaryRange),
      职位链接: safeCell(application.jobUrl),
      下一步行动: safeCell(application.nextAction),
      行动时间: formatDateTime(application.nextActionAt),
      备注: safeCell(application.notes),
      创建时间: formatDateTime(application.createdAt),
      更新时间: formatDateTime(application.updatedAt),
    }));
  const eventRows = [...events]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .map((event) => {
      const application = applicationsById.get(event.applicationId);
      return {
        公司: safeCell(application?.company),
        岗位: safeCell(application?.role),
        事件类型: eventTypeLabels[event.type],
        原阶段: stageLabel(event.fromStage),
        新阶段: stageLabel(event.toStage),
        内容: safeCell(event.content),
        发生时间: formatDateTime(event.occurredAt),
      };
    });

  const workbook = XLSX.utils.book_new();
  const applicationSheet = XLSX.utils.json_to_sheet(applicationRows);
  const eventSheet = XLSX.utils.json_to_sheet(eventRows);
  applicationSheet["!cols"] = [
    { wch: 18 },
    { wch: 22 },
    { wch: 14 },
    { wch: 10 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 32 },
    { wch: 28 },
    { wch: 20 },
    { wch: 36 },
    { wch: 20 },
    { wch: 20 },
  ];
  eventSheet["!cols"] = [
    { wch: 18 },
    { wch: 22 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 36 },
    { wch: 20 },
  ];

  XLSX.utils.book_append_sheet(workbook, applicationSheet, "投递记录");
  XLSX.utils.book_append_sheet(workbook, eventSheet, "进展时间线");
  XLSX.writeFile(workbook, buildFileName(), { compression: true });
}
