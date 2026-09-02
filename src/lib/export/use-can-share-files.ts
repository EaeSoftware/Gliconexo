"use client";

import { useSyncExternalStore } from "react";
import { canShareFiles } from "@/lib/export/download-file";

function subscribe() {
  return () => {};
}

function getServerSnapshot() {
  return false;
}

// `navigator.share`/`canShare` só existem no cliente; usar
// `useSyncExternalStore` evita divergência entre o texto renderizado no
// servidor e o texto renderizado após a hidratação.
export function useCanShareFiles(): boolean {
  return useSyncExternalStore(subscribe, canShareFiles, getServerSnapshot);
}
