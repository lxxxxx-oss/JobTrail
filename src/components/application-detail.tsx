"use client";

import { useMemo, useState } from "react";
import { useApplications } from "@/lib/application-store";
import { formatDate, formatLongDate } from "@/lib/date";
import { priorityLabels, stageDefinitions, stageMap } from "@/lib/stages";
import type { Application, ApplicationEvent, ApplicationStage } from "@/lib/types";
import { CalendarIcon, CloseIcon, LinkIcon, NoteIcon, PencilIcon, TrashIcon } from "./icons";
import { StageBadge } from "./stage-badge";

export function ApplicationDetail({ application, open, onClose, onEdit }: { application: Application | null; open: boolean; onClose(): void; onEdit(application: Application): void }) {
  const { events, changeStage, addNote, deleteApplication } = useApplications();
  const [note, setNote] = useState("");
  const applicationEvents = useMemo(
    () => events.filter((event) => event.applicationId === application?.id).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    [application?.id, events],
  );

  if (!open || !application) return null;

  function handleDelete() {
    if (window.confirm(`确定删除“${application!.company} · ${application!.role}”吗？这会同时删除时间线。`)) {
      deleteApplication(application!.id);
      onClose();
    }
  }

  function submitNote(event: React.FormEvent) {
    event.preventDefault();
    if (!note.trim()) return;
    addNote(application!.id, note);
    setNote("");
  }

  return (
    <div className="modal-backdrop detail-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <header className="detail-header">
          <button className="icon-button" onClick={onClose} aria-label="关闭"><CloseIcon /></button>
          <div className="detail-actions"><button className="secondary-button compact" onClick={() => onEdit(application)}><PencilIcon />编辑</button><button className="danger-button compact" onClick={handleDelete}><TrashIcon />删除</button></div>
        </header>
        <div className="detail-body">
          <div className="detail-title-block">
            <span className="company-avatar large">{application.company.slice(0, 1).toUpperCase()}</span>
            <div><StageBadge stage={application.currentStage} /><h2 id="detail-title">{application.company}</h2><p>{application.role}</p></div>
          </div>

          <section className="detail-section stage-switcher"><label htmlFor="detail-stage">推进到</label><select id="detail-stage" value={application.currentStage} onChange={(event) => changeStage(application.id, event.target.value as ApplicationStage)}>{stageDefinitions.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}</select></section>

          {(application.nextAction || application.nextActionAt) && (
            <section className="next-action-card"><CalendarIcon /><div><span>下一步</span><strong>{application.nextAction || "待处理"}</strong><small>{formatDate(application.nextActionAt, true)}</small></div></section>
          )}

          <section className="detail-section"><h3>岗位信息</h3><dl className="info-list">
            <Info label="优先级" value={priorityLabels[application.priority]} />
            <Info label="投递日期" value={application.appliedAt ? formatDate(application.appliedAt) : "未设置"} />
            <Info label="投递渠道" value={application.source || "未设置"} />
            <Info label="工作地点" value={application.location || "未设置"} />
            <Info label="薪资范围" value={application.salaryRange || "未设置"} />
          </dl>{application.jobUrl && <a className="job-link" href={application.jobUrl} target="_blank" rel="noreferrer"><LinkIcon />打开职位链接</a>}</section>

          {application.notes && <section className="detail-section"><h3>备注</h3><p className="notes-copy">{application.notes}</p></section>}

          <section className="detail-section timeline-section">
            <div className="section-heading"><div><p className="eyebrow">History</p><h3>进展时间线</h3></div><span className="count-pill">{applicationEvents.length}</span></div>
            <form className="note-form" onSubmit={submitNote}><NoteIcon /><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="补充一条沟通或面试记录…" /><button disabled={!note.trim()}>记录</button></form>
            <div className="timeline">{applicationEvents.map((event) => <TimelineItem key={event.id} event={event} />)}</div>
          </section>
        </div>
      </aside>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }

function TimelineItem({ event }: { event: ApplicationEvent }) {
  let title = "创建投递记录";
  let description = event.toStage ? `初始阶段：${stageMap[event.toStage].label}` : "";
  if (event.type === "stage_changed" && event.fromStage && event.toStage) {
    title = `推进到 ${stageMap[event.toStage].label}`;
    description = `从 ${stageMap[event.fromStage].label} 变更`;
  }
  if (event.type === "note") { title = event.content || "补充记录"; description = "手动记录"; }
  return <article className={`timeline-item timeline-${event.type}`}><i /><div><strong>{title}</strong><p>{description}</p><time>{formatLongDate(event.occurredAt)}</time></div></article>;
}
