"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ONBOARDING_STEPS } from "@/features/onboarding/steps";
import { PRIVACY_CONSENT_TYPE, PRIVACY_CONSENT_VERSION } from "@/features/onboarding/consent";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export function OnboardingFlow() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const step = ONBOARDING_STEPS[stepIndex];
  const isLastStep = stepIndex === ONBOARDING_STEPS.length - 1;
  const isFirstStep = stepIndex === 0;

  async function handleNext() {
    if (!isLastStep) {
      setStepIndex((current) => current + 1);
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSubmitError("Sua sessão expirou. Entre novamente para concluir o onboarding.");
      setIsSubmitting(false);
      return;
    }

    const acceptedAt = new Date().toISOString();

    const { error: consentError } = await supabase.from("consent_records").insert({
      user_id: user.id,
      consent_type: PRIVACY_CONSENT_TYPE,
      document_version: PRIVACY_CONSENT_VERSION,
      accepted_at: acceptedAt,
    });

    if (consentError) {
      setSubmitError(
        "Não foi possível registrar seu consentimento. Verifique sua conexão e tente novamente.",
      );
      setIsSubmitting(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ onboarding_completed_at: acceptedAt })
      .eq("id", user.id);

    if (profileError) {
      setSubmitError(
        "Consentimento registrado, mas houve um erro ao concluir o onboarding. Tente novamente.",
      );
      setIsSubmitting(false);
      return;
    }

    router.push("/app");
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-4 py-12 sm:px-6">
      <div className="flex justify-center">
        <Logo size="sm" />
      </div>

      <div
        className="flex justify-center gap-2"
        role="progressbar"
        aria-valuenow={stepIndex + 1}
        aria-valuemin={1}
        aria-valuemax={ONBOARDING_STEPS.length}
        aria-label={`Passo ${stepIndex + 1} de ${ONBOARDING_STEPS.length}`}
      >
        {ONBOARDING_STEPS.map((s, index) => (
          <span
            key={s.id}
            aria-hidden="true"
            className={`h-1.5 w-8 rounded-full ${
              index <= stepIndex ? "bg-brand-blue" : "bg-surface-muted"
            }`}
          />
        ))}
      </div>

      <div className="flex flex-col gap-3 text-center">
        <h1 className="text-2xl font-bold text-foreground">{step.title}</h1>
        <p className="text-foreground/70">{step.description}</p>
      </div>

      {isLastStep ? (
        <label className="flex items-start gap-2 rounded-xl border border-border bg-surface-muted p-4 text-sm text-foreground/80">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-border"
            checked={consentAccepted}
            onChange={(event) => setConsentAccepted(event.target.checked)}
          />
          Li e entendi as informações sobre privacidade e os limites do
          GlicoNexo, e consinto com o tratamento dos meus dados de saúde
          conforme a política de privacidade.
        </label>
      ) : null}

      {submitError ? (
        <p role="alert" className="text-sm font-medium text-status-below">
          {submitError}
        </p>
      ) : null}

      <div className="flex gap-3">
        {!isFirstStep ? (
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => setStepIndex((current) => current - 1)}
            disabled={isSubmitting}
          >
            Voltar
          </Button>
        ) : null}
        <Button
          type="button"
          className="flex-1"
          onClick={handleNext}
          disabled={(isLastStep && !consentAccepted) || isSubmitting}
        >
          {isSubmitting ? "Salvando..." : isLastStep ? "Concluir" : "Continuar"}
        </Button>
      </div>
    </div>
  );
}
