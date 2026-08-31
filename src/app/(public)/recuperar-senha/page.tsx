import Link from "next/link";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = { title: "Recuperar senha" };

export default function RecuperarSenhaPage() {
  return (
    <AuthCard
      title="Recuperar senha"
      description="Informe seu e-mail para receber um link de redefinição de senha."
      footer={
        <Link href="/entrar" className="font-medium text-brand-blue hover:underline">
          Voltar para entrar
        </Link>
      }
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
