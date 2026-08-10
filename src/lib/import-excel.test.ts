import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseApplicationsExcelArrayBuffer } from "./import-excel";

function workbookBuffer(rows: Record<string, unknown>[]) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "投递记录");
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
