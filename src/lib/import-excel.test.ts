import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseApplicationsExcelArrayBuffer } from "./import-excel";

function workbookBuffer(rows: Record<string, unknown>[]) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "投递记录");
  return XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
}

function jobTrailExportBuffer() {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet([
      {
        公司: "Teamily AI",
        岗位: "AI 评测工程师",
        当前阶段: "一面挂",
        优先级: "中优先",
        投递日期: "2026-08-09",
        创建时间: "2026/08/24 12:37",
        更新时间: "2026/08/24 12:37",
      },
    ]),
    "投递记录",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet([
      {
        公司: "Teamily AI",
        岗位: "AI 评测工程师",
        事件类型: "阶段变更",
        原阶段: "一面",
        新阶段: "一面挂",
        内容: "",
        发生时间: "2026/08/24 12:37",
      },
    ]),
    "进展时间线",
  );
  return XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
}

describe("parseApplicationsExcelArrayBuffer", () => {
  it("识别中文列名并转换为投递输入", async () => {
    const preview = await parseApplicationsExcelArrayBuffer(
      workbookBuffer([
        {
          公司: "字节跳动",
          岗位: "前端开发工程师",
          当前阶段: "一面",
          优先级: "高优先级",
          投递日期: "2026-08-10",
          投递渠道: "Boss",
          工作地点: "上海",
          备注: "重点准备项目复盘",
        },
      ]),
    );

    expect(preview.rows).toHaveLength(1);
    expect(preview.rows[0].input).toMatchObject({
      company: "字节跳动",
      role: "前端开发工程师",
      currentStage: "interview_1",
      priority: "high",
      appliedAt: "2026-08-10",
      source: "Boss",
      location: "上海",
      notes: "重点准备项目复盘",
    });
  });

  it("兼容英文列名", async () => {
    const preview = await parseApplicationsExcelArrayBuffer(
      workbookBuffer([
        {
          company: "Tencent",
          role: "Product Manager",
          status: "offer",
          priority: "low",
        },
      ]),
    );

    expect(preview.rows[0].input).toMatchObject({
      company: "Tencent",
      role: "Product Manager",
      currentStage: "offer",
      priority: "low",
    });
  });

  it("识别细分淘汰阶段", async () => {
    const preview = await parseApplicationsExcelArrayBuffer(
      workbookBuffer([
        {
          公司: "阿里巴巴",
          岗位: "前端开发工程师",
          当前阶段: "一面挂",
        },
      ]),
    );

    expect(preview.rows[0].input.currentStage).toBe("rejected_interview_1");
  });

  it("识别 JobTrail 导出的 Excel 并构建完整恢复数据", async () => {
    const preview = await parseApplicationsExcelArrayBuffer(jobTrailExportBuffer());

    expect(preview.restoreData?.applications).toHaveLength(1);
    expect(preview.restoreData?.events).toHaveLength(1);
    expect(preview.restoreData?.applications[0]).toMatchObject({
      company: "Teamily AI",
      role: "AI 评测工程师",
      currentStage: "rejected_interview_1",
      appliedAt: "2026-08-09",
    });
    expect(preview.restoreData?.events[0]).toMatchObject({
      type: "stage_changed",
      fromStage: "interview_1",
      toStage: "rejected_interview_1",
    });
  });

  it("跳过缺少公司或岗位的行", async () => {
    const preview = await parseApplicationsExcelArrayBuffer(
      workbookBuffer([
        { 公司: "小红书", 岗位: "" },
        { 公司: "美团", 岗位: "前端开发工程师" },
      ]),
    );

    expect(preview.rows).toHaveLength(1);
    expect(preview.skippedRows).toEqual([{ rowNumber: 2, reason: "缺少公司或岗位" }]);
  });
});
