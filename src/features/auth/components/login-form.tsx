"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginSchema, type LoginInput } from "@/features/auth/schemas";
import { createClient } from "@/lib/supabase/client";
import { recordTermsConsent } from "@/lib/supabase/consent";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

export function LoginForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [isAnonLoading, setIsAnonLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginInput) {
    setFormError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword(data);

      if (error) {
        setFormError("Não foi possível entrar. Confira seu e-mail e senha.");
        return;
      }

      // Cobre contas criadas antes do registro de consentimento existir,
      // ou cujo cadastro ficou pendente de confirmação de e-mail;
      // idempotente, então repetir a cada login é seguro.
      await recordTermsConsent(supabase);

      router.push("/app");
      router.refresh();
    } catch {
      setFormError("Não foi possível entrar. Tente novamente em instantes.");
    }
  }

  async function onAnonymousSignIn() {
    setFormError(null);
    setIsAnonLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInAnonymously();

      if (error) {
        setFormError("Não foi possível entrar como visitante. Tente novamente em instantes.");
        return;
      }

      router.push("/app");
      router.refresh();
    } catch {
      setFormError("Não foi possível entrar como visitante. Tente novamente em instantes.");
    } finally {
      setIsAnonLoading(false);
    }
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
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />

      <div className="flex justify-end">
        <Link href="/recuperar-senha" className="text-sm font-medium text-brand-blue hover:underline">
          Esqueci minha senha
        </Link>
      </div>

      {formError ? (
        <p role="alert" className="text-sm font-medium text-status-below">
          {formError}
        </p>
      ) : null}

      <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting ? "Entrando..." : "Entrar"}
      </Button>

      <div className="flex items-center gap-3 text-xs text-foreground/50">
        <span className="h-px flex-1 bg-border" />
        ou
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        disabled={isAnonLoading}
        onClick={onAnonymousSignIn}
        className="w-full"
      >
        {isAnonLoading ? "Entrando..." : "Entrar como visitante"}
      </Button>
    </form>
  );
}
