import type { Metadata } from "next";
import { HistoryList } from "@/features/measurements/components/history-list";

export const metadata: Metadata = { title: "Histórico" };

export default function HistoricoPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">Histórico</h1>
      <HistoryList />
    </div>
  );
}
