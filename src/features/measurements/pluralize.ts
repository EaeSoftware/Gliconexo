/**
 * Formata "N medição"/"N medições", opcionalmente com "confirmada(s)".
 * Existe como função única e testada para evitar erros de concordância
 * espalhados pelo código (ex.: "medição" + "ões" = "mediçãoões").
 */
export function formatMeasurementCount(
  count: number,
  options: { confirmed?: boolean } = {},
): string {
  const noun = count === 1 ? "medição" : "medições";
  if (options.confirmed) {
    const adjective = count === 1 ? "confirmada" : "confirmadas";
    return `${count} ${noun} ${adjective}`;
  }
  return `${count} ${noun}`;
}
