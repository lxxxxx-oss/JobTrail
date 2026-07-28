"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ApplicationDetail } from "@/components/application-detail";
import { ApplicationForm } from "@/components/application-form";
import { BoardView } from "@/components/board-view";
import { TodayView } from "@/components/today-view";
import { ApplicationProvider, useApplications } from "@/lib/application-store";
import type { Application } from "@/lib/types";

type View = "today" | "board";

function JobTrailApp() {
  const { applications } = useApplications();
  const [view, setView] = useState<View>("today");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState<Application | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedApplication = useMemo(
    () => applications.find((application) => application.id === selectedId) ?? null,
    [applications, selectedId],
  );

  function openCreate() {
    setEditingApplication(null);
    setIsFormOpen(true);
  }

  function openEdit(application: Application) {
    setSelectedId(null);
    setEditingApplication(application);
    setIsFormOpen(true);
  }

  return (
    <AppShell view={view} onViewChange={setView} onCreate={openCreate}>
      {view === "today" ? (
        <TodayView onCreate={openCreate} onSelect={setSelectedId} />
      ) : (
        <BoardView onCreate={openCreate} onSelect={setSelectedId} />
      )}

      <ApplicationForm
        application={editingApplication}
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      />

      <ApplicationDetail
        application={selectedApplication}
        open={Boolean(selectedApplication)}
        onClose={() => setSelectedId(null)}
        onEdit={openEdit}
      />
    </AppShell>
  );
}

export default function Home() {
  return (
    <ApplicationProvider>
      <JobTrailApp />
    </ApplicationProvider>
  );
}
