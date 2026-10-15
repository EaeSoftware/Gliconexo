import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { HourlyGlucoseSection } from "@/features/measurements/components/hourly-glucose-section";
import type { GlucoseMeasurement } from "@/lib/db/measurement-repository";

// O gráfico (Recharts) é carregado sob demanda e não desenha em jsdom; o que importa aqui é
// a alternativa textual e o resumo, que não dependem dele.
vi.mock("next/dynamic", () => ({
  default: () =>
    function ChartStub() {
      return <div data-testid="hourly-chart" />;
    },
}));

function makeMeasurement(overrides: Partial<GlucoseMeasurement>): GlucoseMeasurement {
  const now = "2026-08-28T12:00:00.000Z";
  return {
    id: crypto.randomUUID(),
    valueMgDl: 100,
    measuredAt: now,
    timezone: "America/Sao_Paulo",
    context: "outro",
    mealRelation: "nao_informado",
    source: "manual",
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("HourlyGlucoseSection", () => {
  it("mostra a tabela equivalente só com as horas que têm medição", () => {
    render(
      <HourlyGlucoseSection
        targetRange={null}
        measurements={[
          // 09h e 09h em São Paulo (média 110), 20h (150)
          makeMeasurement({ measuredAt: "2026-08-28T12:00:00.000Z", valueMgDl: 100 }),
          makeMeasurement({ measuredAt: "2026-08-29T12:30:00.000Z", valueMgDl: 120 }),
          makeMeasurement({ measuredAt: "2026-08-28T23:00:00.000Z", valueMgDl: 150 }),
        ]}
      />,
    );

    const table = screen.getByRole("table", { hidden: true });
    const rows = within(table).getAllByRole("row", { hidden: true });
    // cabeçalho + 2 horas (sem preencher as outras 22)
    expect(rows).toHaveLength(3);
    expect(within(rows[1]).getAllByRole("cell", { hidden: true }).map((c) => c.textContent)).toEqual([
      "09h",
      "110 mg/dL",
      "100 mg/dL",
      "120 mg/dL",
      "2",
    ]);
    expect(screen.getByText(/em 2 horas do dia/i)).toBeInTheDocument();
    expect(screen.getByTestId("hourly-chart")).toBeInTheDocument();
  });

  it("explica que horas sem dados ficam vazias (sem interpolar)", () => {
    render(<HourlyGlucoseSection targetRange={null} measurements={[makeMeasurement({})]} />);

    expect(screen.getByText(/horas sem medição ficam sem ponto/i)).toBeInTheDocument();
  });
});
