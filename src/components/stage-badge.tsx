import { stageMap } from "@/lib/stages";
import type { ApplicationStage } from "@/lib/types";

export function StageBadge({ stage, compact = false }: { stage: ApplicationStage; compact?: boolean }) {
  const definition = stageMap[stage];
  return (
    <span className={`stage-badge stage-${definition.tone}`}>
      <i />{compact ? definition.shortLabel : definition.label}
    </span>
  );
}
