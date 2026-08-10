"use client";

import { useState } from "react";
import { useApplications } from "@/lib/application-store";

export function AuthStatus() {
  const {
    authMessage,
    isSupabaseConfigured,
    signInWithEmail,
    signOut,
    syncLocalDataToCloud,
    userEmail,
  } = useApplications();
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [deliveryMessage, setDeliveryMessage] = useState<string | null>(null);
  const trimmedEmail = email.trim();

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
        {authMessage && (
          <p className="auth-feedback" role="status">
            {authMessage}
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      className="auth-status"
      aria-busy={isSending}
      onSubmit={async (event) => {
        event.preventDefault();
        if (!trimmedEmail || isSending) return;

        setIsSending(true);
        setDeliveryMessage(null);
        const isSent = await signInWithEmail(trimmedEmail);
        if (isSent) {
          setDeliveryMessage(`已向 ${trimmedEmail} 发送登录链接，请打开邮箱完成登录。`);
        }
        setIsSending(false);
      }}
    >
      <span className="auth-chip">云同步未开启</span>
      <input
        aria-label="登录邮箱"
        type="email"
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
          setDeliveryMessage(null);
        }}
        placeholder="输入邮箱开启云同步"
      />
      <button className="text-button" type="submit" disabled={!trimmedEmail || isSending}>
        {isSending ? "发送中…" : deliveryMessage ? "重新发送" : "发送登录链接"}
      </button>
      {(deliveryMessage || authMessage) && (
        <p className={`auth-feedback ${deliveryMessage ? "success" : ""}`} role="status">
          {deliveryMessage ?? authMessage}
        </p>
      )}
    </form>
  );
}
