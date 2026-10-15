"use client";

import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";
import GlucoseLineChart from "@/features/measurements/components/glucose-line-chart";
import HourlyGlucoseChart from "@/features/measurements/components/hourly-glucose-chart";
import { buildHourlyGlucoseProfile } from "@/features/measurements/chart-data";
import type { GlucoseMeasurement } from "@/lib/db/measurement-repository";
import type { TargetRange } from "@/features/measurements/classify";

const CHART_WIDTH = 800;
const CHART_HEIGHT = 320;
const CAPTURE_SCALE = 2;

type ResolvedChartColors = {
  border: string;
  foreground: string;
  statusWithin: string;
  brandBlue: string;
};

function resolveCssVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/**
 * Renderiza um gráfico do Recharts fora da viewport (não `display:none` —
 * `ResponsiveContainer` precisa de tamanho de layout não-nulo para medir
 * via `ResizeObserver`), resolve as cores reais do tema atual (uma
 * `<img>` carregada a partir de um SVG serializado não herda `var(--...)`
 * do documento) e desenha o SVG resultante num canvas PNG. Retorna `null`
 * quando algo falha na captura — o PDF simplesmente omite a imagem nesse
 * caso, nunca fabrica um gráfico vazio.
 */
async function rasterizeChart(
  render: (colors: ResolvedChartColors) => ReactElement,
): Promise<string | null> {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = `${CHART_WIDTH}px`;
  container.style.height = `${CHART_HEIGHT}px`;
  document.body.appendChild(container);

  const root = createRoot(container);
  let objectUrl: string | null = null;

  try {
    const colors: ResolvedChartColors = {
      border: resolveCssVar("--border", "#dbe3ee"),
      foreground: resolveCssVar("--foreground", "#14294b"),
      statusWithin: resolveCssVar("--status-within", "#22c55e"),
      brandBlue: resolveCssVar("--brand-blue", "#1e9af3"),
    };

    root.render(render(colors));

    // Duas animation frames: uma para o commit/layout do React, outra
    // para o paint que o ResizeObserver do Recharts usa para medir o
    // contêiner e desenhar o SVG.
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const svg = container.querySelector("svg");
    if (!svg) return null;

    const serialized = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
    objectUrl = URL.createObjectURL(svgBlob);

    const image = new Image();
    image.src = objectUrl;
    await image.decode();

    const canvas = document.createElement("canvas");
    canvas.width = CHART_WIDTH * CAPTURE_SCALE;
    canvas.height = CHART_HEIGHT * CAPTURE_SCALE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    root.unmount();
    container.remove();
  }
}

/** Rasteriza o gráfico principal (linha do tempo) como PNG para embutir no PDF exportado. */
export async function captureChartImage(
  measurements: GlucoseMeasurement[],
  targetRange: TargetRange | null,
): Promise<string | null> {
  if (measurements.length === 0) return null;
  return rasterizeChart((colors) => (
    <GlucoseLineChart measurements={measurements} targetRange={targetRange} colors={colors} />
  ));
}

/** Rasteriza o gráfico por hora do dia como PNG para o PDF. Sem medições, não gera imagem. */
export async function captureHourlyChartImage(
  measurements: GlucoseMeasurement[],
  targetRange: TargetRange | null,
): Promise<string | null> {
  if (measurements.length === 0) return null;
  const points = buildHourlyGlucoseProfile(measurements);
  return rasterizeChart((colors) => (
    <HourlyGlucoseChart
      points={points}
      targetRange={targetRange}
      height={CHART_HEIGHT}
      colors={colors}
    />
  ));
}
