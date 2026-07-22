"use client";

import { useMemo } from "react";
import { useApplications } from "@/lib/application-store";
import { formatDate, getTaskTiming } from "@/lib/date";
import { calculateMetrics } from "@/lib/metrics";
import { priorityOrder } from "@/lib/stages";
import type { Application } from "@/lib/types";
import { ArrowIcon, CalendarIcon, PlusIcon } from "./icons";
import { EmptyState } from "./empty-state";
import { StageBadge } from "./stage-badge";

const timingLabels = {
  overdue: "已逾期",
  today: "今天",
  upcoming: "未来 7 天",
  later: "稍后",
};

export function TodayView({ onCreate, onSelect, onOpenBoard }: { onCreate(): void; onSelect(id: string): void; onOpenBoard(): void }) {
  const { applications, events, hydrated } = useApplications();
  const metrics = useMemo(() => calculateMetrics(applications, events), [applications, events]);
  const tasks = useMemo(
    () =>
      applications
        .filter((item) => item.nextAction && item.nextActionAt)
        .sort((a, b) => {
          const timeDifference = new Date(a.nextActionAt!).getTime() - new Date(b.nextActionAt!).getTime();
          return timeDifference || priorityOrder[a.priority] - priorityOrder[b.priority];
        }),
    [applications],
  );
  const visibleTasks = tasks.filter((item) => getTaskTiming(item.nextActionAt!) !== "later");
  const recentApplications = [...applications].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4);

  if (!hydrated) return <div className="page-container"><div className="loading-card" /></div>;

  return (
    <div className="page-container today-page">
      <section className="hero-section">
        <div>
          <p className="eyebrow">投递有迹，前程可见</p>
          <h1>今天，推进哪一步？</h1>
          <p className="hero-copy">把每次投递变成清晰的下一步，而不是散落在聊天记录里的记忆。</p>
        </div>
        <button className="primary-button hero-button" onClick={onCreate}><PlusIcon />记录新投递</button>
      </section>

      {applications.length === 0 ? (
        <EmptyState onCreate={onCreate} />
      ) : (
        <>
          <section className="metrics-grid" aria-label="投递统计">
            <MetricCard label="累计投递" value={metrics.submitted.toString()} hint="不含待投递" accent="dark" />
            <MetricCard label="进面率" value={`${metrics.interviewRate}%`} hint={`${metrics.interviewCount} 个岗位进面`} accent="purple" />
            <MetricCard label="Offer 率" value={`${metrics.offerRate}%`} hint={`${metrics.offerCount} 个 Offer`} accent="yellow" />
            <MetricCard label="待办事项" value={visibleTasks.length.toString()} hint="未来 7 天内" accent="green" />
          </section>

          <div className="content-grid">
            <section className="panel task-panel">
              <div className="section-heading">
                <div><p className="eyebrow">Next actions</p><h2>接下来要做</h2></div>
                <span className="count-pill">{visibleTasks.length}</span>
              </div>
              {visibleTasks.length ? (
                <div className="task-list">
                  {visibleTasks.map((application) => (
                    <TaskItem key={application.id} application={application} onSelect={onSelect} />
                  ))}
                </div>
              ) : (
                <div className="soft-empty"><CalendarIcon /><p>未来 7 天暂无待办</p><span>给投递设置下一步，避免错过跟进。</span></div>
              )}
            </section>

            <section className="panel recent-panel">
              <div className="section-heading">
                <div><p className="eyebrow">Recently updated</p><h2>最近推进</h2></div>
                <button className="text-button" onClick={onOpenBoard}>查看看板 <ArrowIcon /></button>
              </div>
              <div className="recent-list">
                {recentApplications.map((application) => (
                  <button key={application.id} className="recent-row" onClick={() => onSelect(application.id)}>
                    <span className="company-avatar">{application.company.slice(0, 1).toUpperCase()}</span>
                    <span className="recent-main"><strong>{application.company}</strong><small>{application.role}</small></span>
                    <StageBadge stage={application.currentStage} compact />
                  </button>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value, hint, accent }: { label: string; value: string; hint: string; accent: string }) {
  return (
    <article className={`metric-card metric-${accent}`}>
      <p>{label}</p><strong>{value}</strong><span>{hint}</span>
    </article>
  );
}

function TaskItem({ application, onSelect }: { application: Application; onSelect(id: string): void }) {
  const timing = getTaskTiming(application.nextActionAt!);
  return (
    <button className="task-item" onClick={() => onSelect(application.id)}>
      <span className={`task-date timing-${timing}`}><small>{timingLabels[timing]}</small><strong>{formatDate(application.nextActionAt, true)}</strong></span>
      <span className="task-copy"><strong>{application.nextAction}</strong><small>{application.company} · {application.role}</small></span>
      <ArrowIcon className="task-arrow" />
    </button>
  );
}
