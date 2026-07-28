import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultData, LocalStorageApplicationRepository, STORAGE_KEY } from "./repository";
import type { JobTrailData } from "./types";

describe("LocalStorageApplicationRepository", () => {
  const repository = new LocalStorageApplicationRepository();

  beforeEach(() => localStorage.clear());

  it("首次使用时提供两条示例投递", async () => {
    const data = await repository.load();

    expect(data.applications).toHaveLength(2);
    expect(data.events).toHaveLength(3);
    expect(data.applications.map((application) => application.currentStage)).toEqual([
      "interview_1",
      "applied",
    ]);
  });

  it("示例投递的待办日期跟随首次使用时间", () => {
    const now = new Date("2026-07-22T08:00:00.000Z");
    const data = createDefaultData(now);

    expect(data.applications[0].nextActionAt).toBe("2026-07-23T02:00:00.000Z");
    expect(data.applications[1].nextActionAt).toBe("2026-07-25T06:00:00.000Z");
  });

  it("保存并重新读取数据", async () => {
    const data: JobTrailData = { version: 1, applications: [], events: [] };
    await repository.save(data);
    await expect(repository.load()).resolves.toEqual(data);
  });

  it("损坏的数据回退为空数据", async () => {
    localStorage.setItem(STORAGE_KEY, "not-json");
    await expect(repository.load()).resolves.toEqual({ version: 1, applications: [], events: [] });
  });
});
