import { beforeEach, describe, expect, it } from "vitest";
import { LocalStorageApplicationRepository, STORAGE_KEY } from "./repository";
import type { JobTrailData } from "./types";

describe("LocalStorageApplicationRepository", () => {
  const repository = new LocalStorageApplicationRepository();

  beforeEach(() => localStorage.clear());

  it("首次使用时读取为空数据", async () => {
    await expect(repository.load()).resolves.toEqual({ version: 1, applications: [], events: [] });
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
