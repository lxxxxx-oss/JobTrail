import type { JobTrailData } from "./types";

export interface ApplicationRepository {
  load(): Promise<JobTrailData>;
  save(data: JobTrailData): Promise<void>;
}

export const STORAGE_KEY = "jobtrail:data:v1";
const DB_NAME = "jobtrail-local";
const DB_VERSION = 1;
const STORE_NAME = "snapshots";
const DATA_KEY = "jobtrail:data:v1";

export const emptyData: JobTrailData = {
  version: 1,
  applications: [],
  events: [],
};

export class LocalStorageApplicationRepository implements ApplicationRepository {
  async load(): Promise<JobTrailData> {
    if (typeof window === "undefined") return emptyData;

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData;

    try {
      const parsed = JSON.parse(raw) as JobTrailData;
      if (parsed.version !== 1 || !Array.isArray(parsed.applications) || !Array.isArray(parsed.events)) {
        return emptyData;
      }
      return parsed;
    } catch {
      return emptyData;
    }
  }

  async save(data: JobTrailData): Promise<void> {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}

export class IndexedDbApplicationRepository implements ApplicationRepository {
  private readonly fallback = new LocalStorageApplicationRepository();

  async load(): Promise<JobTrailData> {
    if (!canUseIndexedDb()) return this.fallback.load();

    try {
      const stored = await this.getSnapshot();
      if (isJobTrailData(stored)) return stored;

      const legacyData = await this.fallback.load();
      await this.save(legacyData);
      return legacyData;
    } catch (error) {
      console.warn("IndexedDB 读取失败，已回退到 localStorage。", error);
      return this.fallback.load();
    }
  }

  async save(data: JobTrailData): Promise<void> {
    await this.fallback.save(data);
    if (!canUseIndexedDb()) return;

    try {
      const database = await openDatabase();
      await putSnapshot(database, data);
      database.close();
    } catch (error) {
      console.warn("IndexedDB 保存失败，localStorage 备份仍已更新。", error);
    }
  }

  private async getSnapshot() {
    const database = await openDatabase();
    const snapshot = await getSnapshot(database);
    database.close();
    return snapshot;
  }
}

function canUseIndexedDb() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("本地数据库正在被其他页面占用，请关闭其它 JobTrail 页面后重试。"));
  });
}

function getSnapshot(database: IDBDatabase) {
  return new Promise<unknown>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(DATA_KEY);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function putSnapshot(database: IDBDatabase, data: JobTrailData) {
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    store.put(data, DATA_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function isJobTrailData(value: unknown): value is JobTrailData {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<JobTrailData>;
  return data.version === 1 && Array.isArray(data.applications) && Array.isArray(data.events);
}
