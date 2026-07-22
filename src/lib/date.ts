export function formatDate(value?: string, includeTime = false) {
  if (!value) return "未设置";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
  }).format(date);
}

export function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export type TaskTiming = "overdue" | "today" | "upcoming" | "later";

export function getTaskTiming(value: string, now = new Date()): TaskTiming {
  const taskDate = new Date(value);
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startTomorrow = new Date(startToday);
  startTomorrow.setDate(startTomorrow.getDate() + 1);
  const weekEnd = new Date(startToday);
  weekEnd.setDate(weekEnd.getDate() + 8);

  if (taskDate < startToday) return "overdue";
  if (taskDate < startTomorrow) return "today";
  if (taskDate < weekEnd) return "upcoming";
  return "later";
}

export function toDateTimeLocal(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
