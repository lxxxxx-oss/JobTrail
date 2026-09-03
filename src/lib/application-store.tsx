"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { IndexedDbApplicationRepository, type ApplicationRepository } from "./repository";
import type {
  Application,
  ApplicationEvent,
  ApplicationInput,
  ApplicationStage,
  JobTrailData,
} from "./types";

interface ApplicationContextValue extends JobTrailData {
  hydrated: boolean;
  createApplication(input: ApplicationInput): string;
  updateApplication(id: string, input: ApplicationInput): void;
  changeStage(id: string, stage: ApplicationStage): void;
  addNote(id: string, content: string): void;
  deleteApplication(id: string): void;
  replaceData(data: JobTrailData): Promise<void>;
}

const initialData: JobTrailData = { version: 1, applications: [], events: [] };
const ApplicationContext = createContext<ApplicationContextValue | null>(null);

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ApplicationProvider({ children }: { children: React.ReactNode }) {
  const localRepository = useMemo(() => new IndexedDbApplicationRepository(), []);
  const [data, setData] = useState<JobTrailData>(initialData);
  const [hydrated, setHydrated] = useState(false);
  const dataRef = useRef(data);
  const repositoryRef = useRef<ApplicationRepository>(localRepository);

  useEffect(() => {
    let mounted = true;
    repositoryRef.current = localRepository;

    localRepository
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
        dataRef.current = initialData;
        setData(initialData);
        setHydrated(true);
      });

    return () => {
      mounted = false;
    };
  }, [localRepository]);

  function commit(updater: (current: JobTrailData) => JobTrailData) {
    const next = updater(dataRef.current);
    dataRef.current = next;
    setData(next);
    repositoryRef.current.save(next).catch((error) => {
      console.error(error);
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

  async function replaceData(next: JobTrailData) {
    dataRef.current = next;
    setData(next);
    await repositoryRef.current.save(next);
  }

  return (
    <ApplicationContext.Provider
      value={{
        ...data,
        hydrated,
        createApplication,
        updateApplication,
        changeStage,
        addNote,
        deleteApplication,
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
