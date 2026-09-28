"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { deleteLocalDatabase } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

type Eligibility = "checking" | "eligible" | "anonymous" | "signed-out";

const CONFIRM_WORD = "EXCLUIR";

export function DeleteAccountSection() {
  const router = useRouter();
  const [eligibility, setEligibility] = useState<Eligibility>("checking");
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (!active) return;
        if (!user) setEligibility("signed-out");
        else if (user.is_anonymous || !user.email) setEligibility("anonymous");
        else setEligibility("eligible");
      })
      .catch(() => {
        if (active) setEligibility("signed-out");
      });
    return () => {
      active = false;
    };
  }, []);

  const canSubmit =
    password.length > 0 && confirmText.trim().toUpperCase() === CONFIRM_WORD && !isDeleting;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setIsDeleting(true);
    try {
      const response = await fetch("/api/conta/excluir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        cache: "no-store",
      });
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setError(body?.message ?? "Não foi possível excluir a conta. Tente novamente em instantes.");
        return;
      }

      // Conta apagada no servidor: limpa os dados privados deste aparelho.
      await deleteLocalDatabase().catch(() => undefined);
      await createClient().auth.signOut({ scope: "local" }).catch(() => undefined);
      router.replace("/");
      router.refresh();
    } catch {
      setError("Sem conexão. A exclusão de conta precisa de internet.");
    } finally {
      setIsDeleting(false);
      setPassword("");
    }
  }

  function onCancel() {
    setIsOpen(false);
    setPassword("");
    setConfirmText("");
    setError(null);
  }

  return (
    <section
      id="excluir-conta"
      className="scroll-mt-6 rounded-2xl border border-status-below/40 bg-status-below/5 p-5"
    >
      <h2 className="mb-2 font-semibold text-foreground">Excluir conta e dados</h2>
      <p className="mb-3 text-sm text-foreground/70">
        Remove permanentemente sua conta, suas medições, preferências e
        registros de consentimento. Esta ação não pode ser desfeita. Se
        quiser guardar uma cópia, exporte seus dados antes.
      </p>

      {eligibility === "checking" ? (
        <p className="text-sm text-foreground/60" aria-live="polite">
          Verificando sua conta...
        </p>
      ) : null}

      {eligibility === "anonymous" ? (
        <p className="text-sm text-foreground/70">
          Você está usando o modo visitante. A exclusão de conta fica
          disponível para contas criadas com e-mail e senha. Para apagar os
          dados de visitante, use <strong>Sair</strong>.
        </p>
      ) : null}

      {eligibility === "signed-out" ? (
        <p className="text-sm text-foreground/70">
          Entre com seu e-mail e senha para excluir sua conta.
        </p>
      ) : null}

      {eligibility === "eligible" && !isOpen ? (
        <Button
          type="button"
          variant="outline"
          className="border-status-below/60 text-status-below"
          onClick={() => setIsOpen(true)}
        >
          Excluir conta
        </Button>
      ) : null}

      {eligibility === "eligible" && isOpen ? (
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <TextField
            label="Sua senha"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isDeleting}
          />
          <TextField
            label={`Digite ${CONFIRM_WORD} para confirmar`}
            autoComplete="off"
            autoCapitalize="characters"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            disabled={isDeleting}
          />
          <div aria-live="assertive">
            {error ? (
              <p role="alert" className="text-sm font-medium text-status-below">
                {error}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              disabled={!canSubmit}
              className="bg-status-below text-white hover:bg-status-below/90"
            >
              {isDeleting ? "Excluindo..." : "Excluir definitivamente"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isDeleting}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
