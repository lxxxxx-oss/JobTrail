"use client";

import { useRef } from "react";
import { useMemo, useState } from "react";
import { useApplications } from "@/lib/application-store";
import { downloadJsonBackup, parseJobTrailBackup } from "@/lib/backup";
import { formatDate } from "@/lib/date";
import { exportApplicationsToExcel } from "@/lib/export-excel";
import { buildApplicationDuplicateKey, parseApplicationsExcelFile, type ApplicationImportPreview } from "@/lib/import-excel";
import {
  boardStageDefinitions,
  getBoardStageId,
  priorityLabels,
  priorityOrder,
  stageDefinitions,
  stageMap,
} from "@/lib/stages";
import type { ApplicationStage } from "@/lib/types";
import { ArrowIcon, BriefcaseIcon, CalendarIcon, CloseIcon, DownloadIcon, PlusIcon, SearchIcon, UploadIcon } from "./icons";
import { EmptyState } from "./empty-state";

export function BoardView({ onCreate, onSelect }: { onCreate(): void; onSelect(id: string): void }) {
  const { applications, events, hydrated, changeStage, createApplication, replaceData } = useApplications();
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<ApplicationStage | "all">("all");
  const [isExporting, setIsExporting] = useState(false);
  const [isImportingExcel, setIsImportingExcel] = useState(false);
  const [toolbarFeedback, setToolbarFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [importPreview, setImportPreview] = useState<ApplicationImportPreview | null>(null);
  const boardScrollRef = useRef<HTMLDivElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const restoreInputRef = useRef<HTMLInputElement | null>(null);
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      applications.filter((item) => {
        const matchesQuery = !normalizedQuery || `${item.company} ${item.role} ${item.source ?? ""}`.toLowerCase().includes(normalizedQuery);
        const matchesStage =
          stageFilter === "all" ||
          item.currentStage === stageFilter ||
          (stageFilter === "rejected" && getBoardStageId(item.currentStage) === "rejected");
        return matchesQuery && matchesStage;
      }),
    [applications, normalizedQuery, stageFilter],
  );
  const visibleStages =
    stageFilter === "all"
      ? boardStageDefinitions
      : boardStageDefinitions.filter((stage) => stage.id === getBoardStageId(stageFilter));
  const importPreviewRows = useMemo(() => {
    if (!importPreview) return [];

    const existingKeys = new Set(applications.map(buildApplicationDuplicateKey));
    const fileKeys = new Set<string>();

    return importPreview.rows.map((row) => {
      const key = buildApplicationDuplicateKey(row.input);
      const isDuplicate = existingKeys.has(key) || fileKeys.has(key);
      fileKeys.add(key);
      return { ...row, isDuplicate };
    });
  }, [applications, importPreview]);
  const duplicateImportCount = importPreviewRows.filter((row) => row.isDuplicate).length;

  async function handleExport() {
    setIsExporting(true);
    setToolbarFeedback(null);
    try {
      await exportApplicationsToExcel(applications, events);
    } catch (error) {
      console.error(error);
      setToolbarFeedback({ type: "error", text: "导出失败，请稍后重试。" });
    } finally {
      setIsExporting(false);
    }
  }

  async function handleImportExcel(file: File | undefined) {
    if (!file) return;
    setIsImportingExcel(true);
    setToolbarFeedback(null);
    try {
      const preview = await parseApplicationsExcelFile(file);
      setImportPreview(preview);
    } catch (error) {
      console.error(error);
      setToolbarFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "导入失败，请选择有效的 Excel 或 CSV 文件。",
      });
    } finally {
      setIsImportingExcel(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  function handleConfirmExcelImport() {
    if (!importPreview) return;
    importPreview.rows.forEach((row) => createApplication(row.input));
    setToolbarFeedback({ type: "success", text: `已追加导入 ${importPreview.rows.length} 条投递记录。` });
    setImportPreview(null);
  }

  function scrollBoard(direction: "left" | "right") {
    boardScrollRef.current?.scrollBy({
      left: direction === "left" ? -620 : 620,
      behavior: "smooth",
    });
  }

  async function handleRestore(file: File | undefined) {
    if (!file) return;
    setToolbarFeedback(null);
    try {
      const backup = parseJobTrailBackup(await file.text());
      const confirmed = window.confirm("恢复备份会覆盖当前所有投递记录和时间线，确定继续吗？");
      if (!confirmed) return;
      await replaceData(backup);
    } catch (error) {
      console.error(error);
      setToolbarFeedback({ type: "error", text: "恢复失败，请选择有效的投程备份文件。" });
    } finally {
      if (restoreInputRef.current) restoreInputRef.current.value = "";
    }
  }

  if (!hydrated) return <div className="page-container"><div className="loading-card" /></div>;

  return (
    <div className="board-page">
      <div className="page-container board-heading">
        <div><p className="eyebrow">Application pipeline</p><h1>投递看板</h1><p>每次推进都会自动记入时间线。</p></div>
        <div className="board-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={() => importInputRef.current?.click()}
            disabled={isImportingExcel}
          >
            <UploadIcon />{isImportingExcel ? "解析中…" : "导入 Excel"}
          </button>
          <button className="primary-button" onClick={onCreate}><PlusIcon />新增投递</button>
        </div>
      </div>
      <input
        ref={importInputRef}
        className="visually-hidden"
        type="file"
        accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
        onChange={(event) => void handleImportExcel(event.target.files?.[0])}
      />

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
            {toolbarFeedback && <span className={`export-error ${toolbarFeedback.type === "success" ? "success" : ""}`}>{toolbarFeedback.text}</span>}
          </div>

          {filtered.length === 0 ? (
            <div className="page-container"><div className="no-results"><SearchIcon /><h3>没有匹配的记录</h3><p>换个关键词或筛选条件试试。</p></div></div>
          ) : (
            <>
              <div className="board-float-nav" aria-label="看板横向移动">
                <button className="board-float-button left" type="button" onClick={() => scrollBoard("left")} aria-label="向左移动看板"><ArrowIcon /></button>
                <button className="board-float-button" type="button" onClick={() => scrollBoard("right")} aria-label="向右移动看板"><ArrowIcon /></button>
              </div>
              <div className="board-scroll" ref={boardScrollRef} tabIndex={0} aria-label="投递看板横向滚动区域">
                <div className="board-columns">
                  {visibleStages.map((stage) => {
                    const stageApplications = filtered
                      .filter((item) => getBoardStageId(item.currentStage) === stage.id)
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
            </>
          )}
        </>
      )}

      {importPreview && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setImportPreview(null)}>
          <section className="modal import-modal" role="dialog" aria-modal="true" aria-labelledby="import-preview-title">
            <header className="modal-header">
              <div>
                <p className="eyebrow">Excel import preview</p>
                <h2 id="import-preview-title">确认导入内容</h2>
              </div>
              <button className="icon-button" onClick={() => setImportPreview(null)} aria-label="关闭"><CloseIcon /></button>
            </header>
            <div className="form-body import-body">
              <div className="import-summary">
                <strong>{importPreview.rows.length}</strong>
                <span>条可导入记录</span>
                <em>工作表：{importPreview.sheetName}</em>
              </div>

              {duplicateImportCount > 0 && (
                <p className="import-warning">
                  发现 {duplicateImportCount} 条疑似重复记录（同公司 + 同岗位）。确认后仍会追加导入，不会覆盖现有记录。
                </p>
              )}

              {importPreview.skippedRows.length > 0 && (
                <div className="import-skipped">
                  <strong>已跳过 {importPreview.skippedRows.length} 行：</strong>
                  {importPreview.skippedRows.slice(0, 4).map((row) => (
                    <span key={row.rowNumber}>第 {row.rowNumber} 行：{row.reason}</span>
                  ))}
                </div>
              )}

              <div className="import-table-wrap">
                <table className="import-table">
                  <thead>
                    <tr>
                      <th>行号</th>
                      <th>公司</th>
                      <th>岗位</th>
                      <th>阶段</th>
                      <th>投递日期</th>
                      <th>渠道</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreviewRows.slice(0, 12).map((row) => (
                      <tr key={row.rowNumber} className={row.isDuplicate ? "import-duplicate" : ""}>
                        <td>{row.rowNumber}</td>
                        <td>{row.input.company}</td>
                        <td>{row.input.role}</td>
                        <td>{stageMap[row.input.currentStage]?.label ?? row.input.currentStage}</td>
                        <td>{row.input.appliedAt ?? "未设置"}</td>
                        <td>{row.input.source ?? "未设置"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {importPreviewRows.length > 12 && <p className="import-more">仅预览前 12 条，确认后会导入全部 {importPreviewRows.length} 条。</p>}
            </div>
            <footer className="modal-footer">
              <button type="button" className="secondary-button" onClick={() => setImportPreview(null)}>取消</button>
              <button type="button" className="primary-button" onClick={handleConfirmExcelImport}>确认追加 {importPreview.rows.length} 条</button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
