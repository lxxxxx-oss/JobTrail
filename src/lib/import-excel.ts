import { priorityLabels, stageDefinitions } from "./stages";
import { applicationStages, type Application, type ApplicationInput, type ApplicationStage, type Priority } from "./types";

export interface ImportedApplicationRow {
  rowNumber: number;
  input: ApplicationInput;
}

export interface SkippedImportRow {
  rowNumber: number;
  reason: string;
}

export interface ApplicationImportPreview {
  sheetName: string;
  totalRows: number;
  rows: ImportedApplicationRow[];
  skippedRows: SkippedImportRow[];
}

type SpreadsheetRow = Record<string, unknown>;
type XlsxModule = typeof import("xlsx");

const fieldAliases = {
  company: ["公司", "企业", "公司名称", "company", "company name"],
  role: ["岗位", "职位", "岗位名称", "职位名称", "role", "title", "job title", "position"],
  currentStage: ["当前阶段", "阶段", "状态", "进度", "stage", "status", "current stage"],
  priority: ["优先级", "priority"],
  appliedAt: ["投递日期", "投递时间", "申请日期", "applied at", "applied date", "date"],
  source: ["投递渠道", "渠道", "来源", "平台", "source", "channel", "platform"],
  location: ["工作地点", "地点", "城市", "location", "city"],
  salaryRange: ["薪资范围", "薪资", "薪水", "salary", "salary range", "compensation"],
  jobUrl: ["职位链接", "岗位链接", "链接", "url", "job url", "link"],
  nextAction: ["下一步行动", "下一步", "待办", "next action", "todo"],
  nextActionAt: ["行动时间", "下一步时间", "待办时间", "next action at", "todo at"],
  notes: ["备注", "笔记", "说明", "notes", "note", "remark"],
} satisfies Record<keyof ApplicationInput, string[]>;

const stageAliases: Record<ApplicationStage, string[]> = {
  wishlist: ["待投递", "收藏", "想投", "wishlist", "todo"],
  applied: ["已投递", "投递", "已申请", "applied", "submitted"],
  assessment: ["测评", "笔试", "测评 / 笔试", "assessment", "test", "exam"],
  interview_ready: ["进面", "面试中", "待面试", "interview", "interview ready"],
  interview_1: ["一面", "1面", "第一轮", "一轮面试", "interview 1", "first interview"],
  interview_2: ["二面", "2面", "第二轮", "二轮面试", "interview 2", "second interview"],
  final_interview: ["终面", "hr面", "hr 面", "final", "final interview"],
  offer: ["offer", "收到offer", "已 offer"],
  accepted: ["已接收", "接受", "入职", "accepted"],
  rejected: ["已淘汰", "被拒", "拒绝", "rejected"],
  rejected_resume: ["简历挂", "简历筛选挂", "简历被拒", "resume rejected", "cv rejected"],
  rejected_assessment: ["笔试挂", "测评挂", "测评被拒", "assessment rejected", "test rejected"],
  rejected_interview_1: ["一面挂", "1面挂", "一轮挂", "first interview rejected"],
  rejected_interview_2: ["二面挂", "2面挂", "二轮挂", "second interview rejected"],
  rejected_interview_3: ["三面挂", "3面挂", "三轮挂", "third interview rejected"],
  rejected_hr: ["hr面挂", "hr 面挂", "hr挂", "hr rejected"],
  withdrawn: ["主动放弃", "放弃", "withdrawn"],
  ghosted: ["长期无回复", "无回复", "ghosted", "no response"],
};

const priorityAliases: Record<Priority, string[]> = {
  high: ["高", "高优先", "高优先级", "high", "p0", "p1"],
  medium: ["中", "中优先", "中优先级", "medium", "normal", "p2"],
  low: ["低", "低优先", "低优先级", "low", "p3"],
};

export async function parseApplicationsExcelFile(file: File): Promise<ApplicationImportPreview> {
  const arrayBuffer = await file.arrayBuffer();
  return parseApplicationsExcelArrayBuffer(arrayBuffer);
}

export async function parseApplicationsExcelArrayBuffer(arrayBuffer: ArrayBuffer): Promise<ApplicationImportPreview> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) throw new Error("Excel 文件里没有可读取的工作表。");

  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<SpreadsheetRow>(worksheet, { defval: "", raw: true });
  const importedRows: ImportedApplicationRow[] = [];
  const skippedRows: SkippedImportRow[] = [];

  rows.forEach((row, index) => {
    if (isBlankRow(row)) return;

    const rowNumber = index + 2;
    const company = pickString(row, fieldAliases.company);
    const role = pickString(row, fieldAliases.role);

    if (!company || !role) {
      skippedRows.push({ rowNumber, reason: "缺少公司或岗位" });
      return;
    }

    importedRows.push({
      rowNumber,
      input: {
        company: limit(company, 60),
        role: limit(role, 80),
        currentStage: parseStage(pickString(row, fieldAliases.currentStage)),
        priority: parsePriority(pickString(row, fieldAliases.priority)),
        appliedAt: parseDateOnly(pickValue(row, fieldAliases.appliedAt), XLSX),
        source: optionalLimitedString(pickString(row, fieldAliases.source), 40),
        location: optionalLimitedString(pickString(row, fieldAliases.location), 60),
        salaryRange: optionalLimitedString(pickString(row, fieldAliases.salaryRange), 60),
        jobUrl: optionalLimitedString(pickString(row, fieldAliases.jobUrl), 500),
        nextAction: optionalLimitedString(pickString(row, fieldAliases.nextAction), 100),
        nextActionAt: parseDateTime(pickValue(row, fieldAliases.nextActionAt), XLSX),
        notes: optionalLimitedString(pickString(row, fieldAliases.notes), 2000),
      },
    });
  });

  if (importedRows.length === 0) {
    throw new Error("没有识别到可导入的投递记录。请至少提供“公司”和“岗位”两列。");
  }

  return {
    sheetName,
    totalRows: rows.filter((row) => !isBlankRow(row)).length,
    rows: importedRows,
    skippedRows,
  };
}

export function buildApplicationDuplicateKey(application: Pick<Application, "company" | "role">) {
  return `${normalizeValue(application.company)}::${normalizeValue(application.role)}`;
}

function isBlankRow(row: SpreadsheetRow) {
  return Object.values(row).every((value) => cellToString(value) === "");
}

function normalizeHeader(value: string) {
  return normalizeValue(value).replace(/[：:()（）【】\[\]_\-—/\\]/g, "");
}

function normalizeValue(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function pickValue(row: SpreadsheetRow, aliases: string[]) {
  const wanted = new Set(aliases.map(normalizeHeader));
  const matchedKey = Object.keys(row).find((key) => wanted.has(normalizeHeader(key)));
  return matchedKey ? row[matchedKey] : undefined;
}

function pickString(row: SpreadsheetRow, aliases: string[]) {
  return cellToString(pickValue(row, aliases));
}

function cellToString(value: unknown) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

function limit(value: string, maxLength: number) {
  return value.slice(0, maxLength);
}

function optionalLimitedString(value: string, maxLength: number) {
  const trimmed = value.trim();
  return trimmed ? limit(trimmed, maxLength) : undefined;
}

function parseStage(value: string): ApplicationStage {
  const normalized = normalizeValue(value);
  if (applicationStages.includes(normalized as ApplicationStage)) return normalized as ApplicationStage;

  const stageFromLabel = stageDefinitions.find((stage) =>
    [stage.label, stage.shortLabel].some((label) => normalizeValue(label) === normalized),
  );
  if (stageFromLabel) return stageFromLabel.id;

  const matched = Object.entries(stageAliases).find(([, aliases]) =>
    aliases.some((alias) => normalizeValue(alias) === normalized),
  );
  return (matched?.[0] as ApplicationStage | undefined) ?? "applied";
}

function parsePriority(value: string): Priority {
  const normalized = normalizeValue(value);
  if (["high", "medium", "low"].includes(normalized)) return normalized as Priority;

  const priorityFromLabel = Object.entries(priorityLabels).find(([, label]) => normalizeValue(label) === normalized);
  if (priorityFromLabel) return priorityFromLabel[0] as Priority;

  const matched = Object.entries(priorityAliases).find(([, aliases]) =>
    aliases.some((alias) => normalizeValue(alias) === normalized),
  );
  return (matched?.[0] as Priority | undefined) ?? "medium";
}

function parseDateOnly(value: unknown, XLSX: XlsxModule) {
  const date = parseDate(value, XLSX);
  return date ? date.toISOString().slice(0, 10) : undefined;
}

function parseDateTime(value: unknown, XLSX: XlsxModule) {
  const date = parseDate(value, XLSX);
  return date ? date.toISOString() : undefined;
}

function parseDate(value: unknown, XLSX: XlsxModule) {
  if (value === null || value === undefined || value === "") return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return undefined;
    return new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, Math.floor(parsed.S));
  }

  const text = cellToString(value);
  if (!text) return undefined;

  const normalized = text
    .replace(/[年月.]/g, "-")
    .replace("日", "")
    .replace(/\//g, "-")
    .replace(/\s+/g, " ");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
