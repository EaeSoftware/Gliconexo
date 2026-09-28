"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clearActiveUserLocalData, setActiveUser } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

const CONFIRMATION_PHRASE = "EXCLUIR";

type Step = "idle" | "confirming" | "reauth" | "submitting";

/**
 * Exclusão de conta (CLAUDE.md, seção 10.13 e 15): aviso de ação
 * irreversível, confirmação de segurança e encerramento de sessão.
 *
 * A confirmação de segurança usa a senha da conta quando o usuário tem
 * uma (reautenticação via `signInWithPassword`, prova posse ativa da
 * credencial). Contas anônimas (`signInAnonymously`, sem senha) usam
 * uma frase digitada como confirmação equivalente.
 */
export function DeleteAccountButton() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const [isAnonymous, setIsAnonymous] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirmationText, setConfirmationText] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function startConfirmation() {
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setIsAnonymous(Boolean(user?.is_anonymous));
    setStep("confirming");
  }

  function cancel() {
    setStep("idle");
    setPassword("");
    setConfirmationText("");
    setError(null);
  }

  async function handleDelete() {
    setError(null);
    const supabase = createClient();

    if (isAnonymous) {
      if (confirmationText.trim().toUpperCase() !== CONFIRMATION_PHRASE) {
        setError(`Digite "${CONFIRMATION_PHRASE}" para confirmar.`);
        return;
      }
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) {
        setError("Não foi possível confirmar sua sessão. Tente novamente.");
        return;
      }
      setStep("submitting");
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });
      if (reauthError) {
        setError("Senha incorreta.");
        setStep("reauth");
        return;
      }
    }

    setStep("submitting");
    try {
      const response = await fetch("/api/account/delete", { method: "POST" });
      const result: { ok: boolean; message: string } = await response.json();

      if (!result.ok) {
        setError(result.message);
        setStep(isAnonymous ? "confirming" : "reauth");
        return;
      }

      await supabase.auth.signOut();
      await clearActiveUserLocalData();
      setActiveUser(null);
      router.push("/entrar");
      router.refresh();
    } catch {
      setError("Não foi possível excluir a conta agora. Tente novamente.");
      setStep(isAnonymous ? "confirming" : "reauth");
    }
  }

  if (step === "idle") {
    return (
      <Button
        type="button"
        variant="outline"
        className="border-status-below/40 text-status-below hover:bg-status-below/10"
        onClick={startConfirmation}
      >
        Excluir conta
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-status-below/40 bg-status-below/5 p-4">
      <p className="text-sm font-medium text-status-below">
        Esta ação é irreversível. Sua conta e os dados vinculados serão
        apagados permanentemente e não podem ser recuperados.
      </p>

      {step !== "confirming" || isAnonymous ? null : (
        <p className="text-sm text-foreground/70">
          Para continuar, confirme que deseja excluir sua conta.
        </p>
      )}

      {!isAnonymous && (step === "reauth" || step === "submitting") ? (
        <TextField
          label="Digite sua senha para confirmar"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={step === "submitting"}
        />
      ) : null}

      {isAnonymous && (step === "confirming" || step === "submitting") ? (
        <TextField
          label={`Digite "${CONFIRMATION_PHRASE}" para confirmar`}
          value={confirmationText}
          onChange={(event) => setConfirmationText(event.target.value)}
          disabled={step === "submitting"}
        />
      ) : null}

      {error ? (
        <p role="alert" className="text-sm font-medium text-status-below">
          {error}
        </p>
      ) : null}

      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={cancel} disabled={step === "submitting"}>
          Cancelar
        </Button>
        {step === "confirming" && !isAnonymous ? (
          <Button
            type="button"
            className="flex-1 bg-status-below hover:bg-status-below/90"
            onClick={() => setStep("reauth")}
          >
            Continuar
          </Button>
        ) : (
          <Button
            type="button"
            className="flex-1 bg-status-below hover:bg-status-below/90"
            onClick={handleDelete}
            disabled={step === "submitting"}
          >
            {step === "submitting" ? "Excluindo..." : "Excluir permanentemente"}
          </Button>
        )}
      </div>
    </div>
  );
}
