import { describe, expect, it } from "vitest";
import { boardStageDefinitions, getBoardStageId, rejectedStageIds, stageMap } from "./stages";

describe("淘汰阶段分组", () => {
  it("细分淘汰状态都归入看板的已淘汰列", () => {
    expect(rejectedStageIds.map(getBoardStageId)).toEqual(rejectedStageIds.map(() => "rejected"));
  });

  it("看板列不横向展开细分淘汰状态", () => {
    const boardStageIds = boardStageDefinitions.map((stage) => stage.id);

    expect(boardStageIds).toContain("rejected");
    expect(boardStageIds).not.toContain("rejected_resume");
    expect(boardStageIds).not.toContain("rejected_interview_1");
  });

  it("细分淘汰状态有可读标签", () => {
    expect(stageMap.rejected_resume.label).toBe("简历挂");
    expect(stageMap.rejected_hr.label).toBe("HR 面挂");
  });
});
