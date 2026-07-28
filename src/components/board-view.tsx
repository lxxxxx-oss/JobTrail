"use client";

import { useRef } from "react";
import { useMemo, useState } from "react";
import { useApplications } from "@/lib/application-store";
import { downloadJsonBackup, parseJobTrailBackup } from "@/lib/backup";
import { formatDate } from "@/lib/date";
import { exportApplicationsToExcel } from "@/lib/export-excel";
import { priorityLabels, priorityOrder, stageDefinitions } from "@/lib/stages";
import type { ApplicationStage } from "@/lib/types";
import { BriefcaseIcon, CalendarIcon, DownloadIcon, PlusIcon, SearchIcon, UploadIcon } from "./icons";
import { EmptyState } from "./empty-state";

export function BoardView({ onCreate, onSelect }: { onCreate(): void; onSelect(id: string): void }) {
  const { applications, events, hydrated, changeStage, replaceData } = useApplications();
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<ApplicationStage | "all">("all");
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const restoreInputRef = useRef<HTMLInputElement | null>(null);
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      applications.filter((item) => {
        const matchesQuery = !normalizedQuery || `${item.company} ${item.role} ${item.source ?? ""}`.toLowerCase().includes(normalizedQuery);
        const matchesStage = stageFilter === "all" || item.currentStage === stageFilter;
        return matchesQuery && matchesStage;
      }),
    [applications, normalizedQuery, stageFilter],
  );
  const visibleStages = stageFilter === "all" ? stageDefinitions : stageDefinitions.filter((stage) => stage.id === stageFilter);

  async function handleExport() {
    setIsExporting(true);
    setExportError(null);
    try {
      await exportApplicationsToExcel(applications, events);
    } catch (error) {
      console.error(error);
      setExportError("导出失败，请稍后重试。");
    } finally {
      setIsExporting(false);
    }
  }

  async function handleRestore(file: File | undefined) {
    if (!file) return;
    setExportError(null);
    try {
      const backup = parseJobTrailBackup(await file.text());
      const confirmed = window.confirm("恢复备份会覆盖当前所有投递记录和时间线，确定继续吗？");
      if (!confirmed) return;
      await replaceData(backup);
    } catch (error) {
      console.error(error);
      setExportError("恢复失败，请选择有效的投程备份文件。");
    } finally {
      if (restoreInputRef.current) restoreInputRef.current.value = "";
    }
  }

  if (!hydrated) return <div className="page-container"><div className="loading-card" /></div>;

  return (
    <div className="board-page">
      <div className="page-container board-heading">
        <div><p className="eyebrow">Application pipeline</p><h1>投递看板</h1><p>每次推进都会自动记入时间线。</p></div>
        <button className="primary-button" onClick={onCreate}><PlusIcon />新增投递</button>
      </div>

      {applications.length === 0 ? (
        <div className="page-container"><EmptyState onCreate={onCreate} /></div>
      ) : (
        <>
          <div className="page-container board-toolbar">
            <label className="search-field"><SearchIcon /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索公司、岗位或渠道" /></label>
            <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value as ApplicationStage | "all")} aria-label="按阶段筛选">
              <option value="all">全部阶段</option>
              {stageDefinitions.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
            </select>
            <span className="result-count">{filtered.length} 条记录</span>
            <button
              className="secondary-button compact export-button"
              type="button"
              onClick={() => void handleExport()}
              disabled={isExporting || applications.length === 0}
            >
              <DownloadIcon />{isExporting ? "导出中" : "导出 Excel"}
            </button>
            <button
              className="secondary-button compact backup-button"
              type="button"
              onClick={() => downloadJsonBackup({ version: 1, applications, events })}
              disabled={applications.length === 0}
            >
              <DownloadIcon />备份 JSON
            </button>
            <button
              className="secondary-button compact backup-button"
              type="button"
              onClick={() => restoreInputRef.current?.click()}
            >
              <UploadIcon />恢复备份
            </button>
            <input
              ref={restoreInputRef}
              className="visually-hidden"
              type="file"
              accept="application/json,.json"
              onChange={(event) => void handleRestore(event.target.files?.[0])}
            />
            {exportError && <span className="export-error">{exportError}</span>}
          </div>

          {filtered.length === 0 ? (
            <div className="page-container"><div className="no-results"><SearchIcon /><h3>没有匹配的记录</h3><p>换个关键词或筛选条件试试。</p></div></div>
          ) : (
            <div className="board-scroll">
              <div className="board-columns">
                {visibleStages.map((stage) => {
                  const stageApplications = filtered
                    .filter((item) => item.currentStage === stage.id)
                    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || b.updatedAt.localeCompare(a.updatedAt));
                  return (
                    <section className="board-column" key={stage.id}>
                      <header><span className={`column-dot stage-${stage.tone}`} /><h2>{stage.label}</h2><em>{stageApplications.length}</em></header>
                      <div className="column-cards">
                        {stageApplications.map((application) => (
                          <article className="job-card" key={application.id} onClick={() => onSelect(application.id)} tabIndex={0} onKeyDown={(event) => event.key === "Enter" && onSelect(application.id)}>
                            <div className="job-card-top"><span className="company-avatar">{application.company.slice(0, 1).toUpperCase()}</span><span className={`priority priority-${application.priority}`}>{priorityLabels[application.priority]}</span></div>
                            <h3>{application.company}</h3><p>{application.role}</p>
                            <div className="job-meta">
                              {application.nextActionAt && <span><CalendarIcon />{formatDate(application.nextActionAt)}</span>}
                              {application.location && <span><BriefcaseIcon />{application.location}</span>}
                            </div>
                            <select value={application.currentStage} onClick={(event) => event.stopPropagation()} onChange={(event) => changeStage(application.id, event.target.value as ApplicationStage)} aria-label={`更改 ${application.company} ${application.role} 的阶段`}>
                              {stageDefinitions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                            </select>
                          </article>
                        ))}
                        {stageApplications.length === 0 && <div className="column-empty">暂无记录</div>}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
