"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupInput } from "@/features/auth/schemas";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import Link from "next/link";

export function SignupForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({ resolver: zodResolver(signupSchema) });

  async function onSubmit(data: SignupInput) {
    setFormError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });

      if (error) {
        setFormError("Não foi possível criar sua conta. Tente novamente em instantes.");
        return;
      }

      setSuccess(true);
    } catch {
      setFormError("Não foi possível criar sua conta. Tente novamente em instantes.");
    }
  }

  if (success) {
    return (
      <div role="status" className="flex flex-col gap-2 text-center">
        <p className="font-medium text-foreground">Conta criada com sucesso.</p>
        <p className="text-sm text-foreground/70">
          Se a confirmação por e-mail estiver ativada, verifique sua caixa de
          entrada antes de entrar.
        </p>
        <Link href="/entrar" className="mt-2 font-medium text-brand-blue hover:underline">
          Ir para a tela de entrar
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <TextField
        label="E-mail"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <TextField
        label="Senha"
        type="password"
        autoComplete="new-password"
        hint="Mínimo de 8 caracteres."
        error={errors.password?.message}
        {...register("password")}
      />
      <TextField
        label="Confirmar senha"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      <div className="flex items-start gap-2">
        <input
          id="acceptedTerms"
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-border"
          {...register("acceptedTerms")}
        />
        <label htmlFor="acceptedTerms" className="text-sm text-foreground/80">
          Li e aceito os{" "}
          <Link href="/termos" className="text-brand-blue hover:underline">
            termos de uso
          </Link>{" "}
          e a{" "}
          <Link href="/privacidade" className="text-brand-blue hover:underline">
            política de privacidade
          </Link>
          .
        </label>
      </div>
      {errors.acceptedTerms ? (
        <p role="alert" className="text-sm font-medium text-status-below">
          {errors.acceptedTerms.message}
        </p>
      ) : null}

      {formError ? (
        <p role="alert" className="text-sm font-medium text-status-below">
          {formError}
        </p>
      ) : null}

      <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting ? "Criando conta..." : "Criar conta"}
      </Button>
    </form>
  );
}
