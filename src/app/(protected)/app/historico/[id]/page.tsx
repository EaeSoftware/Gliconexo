import type { Metadata } from "next";
import { MeasurementDetail } from "@/features/measurements/components/measurement-detail";

export const metadata: Metadata = { title: "Detalhe da medição" };

export default async function HistoricoDetalhePage(
  props: PageProps<"/app/historico/[id]">,
) {
  const { id } = await props.params;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
      <MeasurementDetail id={id} />
    </div>
  );
}
