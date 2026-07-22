"use client";

import { BoardIcon, PlusIcon, SunIcon } from "./icons";

interface AppShellProps {
  view: "today" | "board";
  onViewChange(view: "today" | "board"): void;
  onCreate(): void;
  children: React.ReactNode;
}

export function AppShell({ view, onViewChange, onCreate, children }: AppShellProps) {
  return (
    <div className="app-frame">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => onViewChange("today")} aria-label="返回今日概览">
          <span className="brand-mark">T</span>
          <span>
            <strong>投程</strong>
            <small>JobTrail</small>
          </span>
        </button>

        <nav className="desktop-nav" aria-label="主导航">
          <button className={view === "today" ? "nav-item active" : "nav-item"} onClick={() => onViewChange("today")}>
            <SunIcon />今日
          </button>
          <button className={view === "board" ? "nav-item active" : "nav-item"} onClick={() => onViewChange("board")}>
            <BoardIcon />看板
          </button>
        </nav>

        <button className="primary-button header-create" onClick={onCreate}>
          <PlusIcon />新增投递
        </button>
      </header>

      <main>{children}</main>

      <nav className="mobile-nav" aria-label="移动端主导航">
        <button className={view === "today" ? "active" : ""} onClick={() => onViewChange("today")}>
          <SunIcon />
          <span>今日</span>
        </button>
        <button className="mobile-create" onClick={onCreate} aria-label="新增投递"><PlusIcon /></button>
        <button className={view === "board" ? "active" : ""} onClick={() => onViewChange("board")}>
          <BoardIcon />
          <span>看板</span>
        </button>
      </nav>
    </div>
  );
}
