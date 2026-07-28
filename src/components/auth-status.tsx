"use client";

import { useState } from "react";
import { useApplications } from "@/lib/application-store";

export function AuthStatus() {
  const {
    authMessage,
    dataSource,
    isSupabaseConfigured,
    signInWithEmail,
    signOut,
    syncLocalDataToCloud,
    userEmail,
  } = useApplications();
  const [email, setEmail] = useState("");

  if (!isSupabaseConfigured) {
    return <span className="auth-chip">本地模式</span>;
  }

  if (userEmail) {
    return (
      <div className="auth-status">
        <span className="auth-chip cloud">云端同步</span>
        <span className="auth-email">{userEmail}</span>
        <button className="text-button" type="button" onClick={() => void syncLocalDataToCloud()}>
          同步本机数据
        </button>
        <button className="text-button" type="button" onClick={() => void signOut()}>
          退出
        </button>
        {authMessage && <small>{authMessage}</small>}
      </div>
    );
  }

  return (
    <form
      className="auth-status"
      onSubmit={(event) => {
        event.preventDefault();
        if (!email.trim()) return;
        void signInWithEmail(email.trim());
      }}
    >
      <span className="auth-chip">{dataSource === "local" ? "本地模式" : "云端同步"}</span>
      <input
        aria-label="登录邮箱"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="邮箱登录"
      />
      <button className="text-button" type="submit">
        发送链接
      </button>
      {authMessage && <small>{authMessage}</small>}
    </form>
  );
}
