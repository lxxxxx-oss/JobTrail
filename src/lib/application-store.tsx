"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "./supabase";
import {
  LocalStorageApplicationRepository,
  SupabaseApplicationRepository,
  type ApplicationRepository,
} from "./repository";
import type {
  Application,
  ApplicationEvent,
  ApplicationInput,
  ApplicationStage,
  JobTrailData,
} from "./types";

interface ApplicationContextValue extends JobTrailData {
  hydrated: boolean;
  authMessage: string | null;
  dataSource: "local" | "supabase";
  isSupabaseConfigured: boolean;
  userEmail: string | null;
  createApplication(input: ApplicationInput): string;
  updateApplication(id: string, input: ApplicationInput): void;
  changeStage(id: string, stage: ApplicationStage): void;
  addNote(id: string, content: string): void;
  deleteApplication(id: string): void;
  signInWithEmail(email: string): Promise<boolean>;
  signOut(): Promise<void>;
  syncLocalDataToCloud(): Promise<void>;
  replaceData(data: JobTrailData): Promise<void>;
}

const initialData: JobTrailData = { version: 1, applications: [], events: [] };
const ApplicationContext = createContext<ApplicationContextValue | null>(null);

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ApplicationProvider({ children }: { children: React.ReactNode }) {
  const localRepository = useMemo(() => new LocalStorageApplicationRepository(), []);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [data, setData] = useState<JobTrailData>(initialData);
  const [hydrated, setHydrated] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const dataRef = useRef(data);
  const repositoryRef = useRef<ApplicationRepository>(localRepository);

  const cloudRepository = useMemo(
    () => (supabase && user ? new SupabaseApplicationRepository(supabase, user.id) : null),
    [supabase, user],
  );
  const activeRepository = cloudRepository ?? localRepository;
  const dataSource = cloudRepository ? "supabase" : "local";

  useEffect(() => {
    if (!supabase) return;

    const supabaseClient = supabase;
    let mounted = true;

    async function initializeAuth() {
      let authCallbackError: string | null = null;

      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error } = await supabaseClient.auth.exchangeCodeForSession(code);
          authCallbackError = error?.message ?? null;

          url.searchParams.delete("code");
          window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
        }
      }

      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      if (!mounted) return;
      const sessionUser = session?.user ? { id: session.user.id, email: session.user.email } : null;
      setUser(sessionUser);

      if (sessionUser) {
        setAuthMessage(null);
        return;
      }

      if (authCallbackError) {
        const isPkceStorageError = authCallbackError.toLowerCase().includes("code verifier");
        setAuthMessage(
          isPkceStorageError
            ? "登录链接没有在同一个浏览器里完成校验。请回到刚才发送邮件的这个浏览器重新发送登录链接，并打开最新邮件；如果邮箱默认打开了别的浏览器，可以复制链接粘贴到当前浏览器打开。"
            : `登录链接处理失败：${authCallbackError}`,
        );
      }
    }

    void initializeAuth();

    const { data: listener } = supabaseClient.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
      if (event === "SIGNED_IN") setAuthMessage(null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    let mounted = true;
    repositoryRef.current = activeRepository;

    activeRepository
      .load()
      .then((loaded) => {
        if (!mounted) return;
        dataRef.current = loaded;
        setData(loaded);
        setHydrated(true);
      })
      .catch((error) => {
        if (!mounted) return;
        console.error(error);
        setAuthMessage("云端数据读取失败，已暂时切回本地数据。");
        localRepository.load().then((loaded) => {
          if (!mounted) return;
          repositoryRef.current = localRepository;
          dataRef.current = loaded;
          setData(loaded);
          setHydrated(true);
        });
      });

    return () => {
      mounted = false;
    };
  }, [activeRepository, localRepository]);

  function commit(updater: (current: JobTrailData) => JobTrailData) {
    const next = updater(dataRef.current);
    dataRef.current = next;
    setData(next);
    repositoryRef.current.save(next).catch((error) => {
      console.error(error);
      setAuthMessage("数据保存失败，请稍后重试。");
    });
  }

  function createApplication(input: ApplicationInput) {
    const id = createId();
    const now = new Date().toISOString();
    const application: Application = { ...input, id, createdAt: now, updatedAt: now };
    const event: ApplicationEvent = {
      id: createId(),
      applicationId: id,
      type: "created",
      toStage: input.currentStage,
      occurredAt: now,
    };

    commit((current) => ({
      ...current,
      applications: [application, ...current.applications],
      events: [event, ...current.events],
    }));
    return id;
  }

  function updateApplication(id: string, input: ApplicationInput) {
    const currentApplication = dataRef.current.applications.find((item) => item.id === id);
    if (!currentApplication) return;

    const now = new Date().toISOString();
    const stageChanged = currentApplication.currentStage !== input.currentStage;
    const event: ApplicationEvent | null = stageChanged
      ? {
          id: createId(),
          applicationId: id,
          type: "stage_changed",
          fromStage: currentApplication.currentStage,
          toStage: input.currentStage,
          occurredAt: now,
        }
      : null;

    commit((current) => ({
      ...current,
      applications: current.applications.map((item) =>
        item.id === id ? { ...item, ...input, updatedAt: now } : item,
      ),
      events: event ? [event, ...current.events] : current.events,
    }));
  }

  function changeStage(id: string, stage: ApplicationStage) {
    const application = dataRef.current.applications.find((item) => item.id === id);
    if (!application || application.currentStage === stage) return;
    updateApplication(id, { ...application, currentStage: stage });
  }

  function addNote(id: string, content: string) {
    const trimmed = content.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
    const event: ApplicationEvent = {
      id: createId(),
      applicationId: id,
      type: "note",
      content: trimmed,
      occurredAt: now,
    };
    commit((current) => ({ ...current, events: [event, ...current.events] }));
  }

  function deleteApplication(id: string) {
    commit((current) => ({
      ...current,
      applications: current.applications.filter((item) => item.id !== id),
      events: current.events.filter((event) => event.applicationId !== id),
    }));
  }

  async function signInWithEmail(email: string) {
    if (!supabase) {
      setAuthMessage("还没有配置 Supabase，当前使用本地模式。");
      return false;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: typeof window === "undefined" ? undefined : window.location.origin,
      },
    });

    if (error) {
      setAuthMessage(error.message);
      return false;
    }

    setAuthMessage("登录链接已发送，请打开邮箱完成登录。");
    return true;
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthMessage(error.message);
      return;
    }
    setAuthMessage("已退出登录，当前显示本地数据。");
  }

  async function syncLocalDataToCloud() {
    if (!cloudRepository) {
      setAuthMessage("登录后才能同步本机数据到云端。");
      return;
    }

    try {
      setAuthMessage("正在同步本机数据到云端…");
      const localData = await localRepository.load();
      await cloudRepository.save(localData);
      dataRef.current = localData;
      setData(localData);
      setAuthMessage("本机数据已同步到云端。");
    } catch (error) {
      console.error(error);
      setAuthMessage(error instanceof Error ? `同步失败：${error.message}` : "同步失败，请稍后重试。");
    }
  }

  async function replaceData(next: JobTrailData) {
    dataRef.current = next;
    setData(next);
    await repositoryRef.current.save(next);
    setAuthMessage("备份数据已恢复。");
  }

  return (
    <ApplicationContext.Provider
      value={{
        ...data,
        hydrated,
        authMessage,
        dataSource,
        isSupabaseConfigured: Boolean(supabase),
        userEmail: user?.email ?? null,
        createApplication,
        updateApplication,
        changeStage,
        addNote,
        deleteApplication,
        signInWithEmail,
        signOut,
        syncLocalDataToCloud,
        replaceData,
      }}
    >
      {children}
    </ApplicationContext.Provider>
  );
}

export function useApplications() {
  const context = useContext(ApplicationContext);
  if (!context) throw new Error("useApplications must be used within ApplicationProvider");
  return context;
}
