import { interviewStages, offerStages } from "./stages";
import type { Application, ApplicationEvent, ApplicationStage } from "./types";

function hasVisitedStage(
  application: Application,
  events: ApplicationEvent[],
  stages: ApplicationStage[],
) {
  if (stages.includes(application.currentStage)) return true;
  return events.some(
    (event) => event.applicationId === application.id && event.toStage && stages.includes(event.toStage),
  );
}

export function calculateMetrics(applications: Application[], events: ApplicationEvent[]) {
  const submitted = applications.filter((item) => item.currentStage !== "wishlist");
  const interviewCount = submitted.filter((item) => hasVisitedStage(item, events, interviewStages)).length;
  const offerCount = submitted.filter((item) => hasVisitedStage(item, events, offerStages)).length;
  const pendingTasks = applications.filter(
    (item) => item.nextAction && item.nextActionAt && new Date(item.nextActionAt).getTime() >= Date.now() - 86_400_000,
  ).length;

  return {
    submitted: submitted.length,
    interviewCount,
    offerCount,
    pendingTasks,
    interviewRate: submitted.length ? Math.round((interviewCount / submitted.length) * 100) : 0,
    offerRate: submitted.length ? Math.round((offerCount / submitted.length) * 100) : 0,
  };
}
