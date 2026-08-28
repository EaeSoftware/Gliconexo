"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/features/auth/schemas";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

export function ResetPasswordForm() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  async function onSubmit(data: ResetPasswordInput) {
    const supabase = createClient();
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/entrar`
        : undefined;

    await supabase.auth.resetPasswordForEmail(data.email, { redirectTo });

    // Mensagem genérica sempre exibida: evita confirmar se o e-mail existe na base.
    setSent(true);
  }

  if (sent) {
    return (
      <p role="status" className="text-center text-sm text-foreground/80">
        Se o e-mail informado estiver cadastrado, você receberá um link para
        redefinir sua senha.
      </p>
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
      <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting ? "Enviando..." : "Enviar link de recuperação"}
      </Button>
    </form>
  );
}
