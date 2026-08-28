import Link from "next/link";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function EntrarPage() {
  return (
    <AuthCard
      title="Entrar"
      description="Acesse sua conta para registrar e consultar suas medições."
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-medium text-brand-blue hover:underline">
            Criar conta
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthCard>
  );
}
