import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Detalhe da medição" };

export default async function HistoricoDetalhePage(
  props: PageProps<"/app/historico/[id]">,
) {
  await props.params;

  // TODO (Fase 3): buscar a medição real no repositório local/Supabase pelo id.
  // Sem uma fonte de dados ainda implementada, nenhum id corresponde a um registro real.
  notFound();
}
