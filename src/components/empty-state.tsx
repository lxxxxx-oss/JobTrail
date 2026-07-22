import { BriefcaseIcon, PlusIcon } from "./icons";

export function EmptyState({ onCreate, title = "还没有投递记录", description = "记下第一条投递，后面的每一步都会有迹可循。" }: { onCreate(): void; title?: string; description?: string }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><BriefcaseIcon /></span>
      <h3>{title}</h3>
      <p>{description}</p>
      <button className="primary-button" onClick={onCreate}><PlusIcon />新增第一条投递</button>
    </div>
  );
}
