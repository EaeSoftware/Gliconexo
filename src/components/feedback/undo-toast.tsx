"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

type UndoToastProps = {
  message: string;
  durationMs?: number;
  onUndo: () => void;
  onExpire: () => void;
};

export function UndoToast({ message, durationMs = 6000, onUndo, onExpire }: UndoToastProps) {
  useEffect(() => {
    const timer = setTimeout(onExpire, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, onExpire]);

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-20 z-20 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-lg sm:bottom-6"
    >
      <p className="text-sm text-foreground">{message}</p>
      <Button type="button" variant="ghost" className="min-h-8 px-3 text-sm" onClick={onUndo}>
        Desfazer
      </Button>
    </div>
  );
}
