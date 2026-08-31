"use client";

import { useOnlineStatus } from "@/lib/offline/use-online-status";

export function ConnectionStatus() {
  const isOnline = useOnlineStatus();

  return (
    <span
      role="status"
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
        isOnline
          ? "bg-status-within/10 text-status-within"
          : "bg-status-above/10 text-status-above"
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-status-within" : "bg-status-above"}`}
      />
      {isOnline ? "Online" : "Offline"}
    </span>
  );
}
