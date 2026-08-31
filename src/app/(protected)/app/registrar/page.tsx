import type { Metadata } from "next";
import { RegisterTabs } from "@/features/measurements/components/register-tabs";

export const metadata: Metadata = { title: "Registrar medição" };

export default function RegistrarPage() {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold text-foreground">Registrar glicemia</h1>
      <p className="mb-6 text-sm text-foreground/70">
        Valor em mg/dL. Você pode fotografar o visor do glicosímetro ou
        digitar o valor manualmente.
      </p>
      <RegisterTabs />
    </div>
  );
}
