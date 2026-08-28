import Link from "next/link";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/features/auth/components/signup-form";

export const metadata: Metadata = { title: "Criar conta" };

export default function CadastroPage() {
  return (
    <AuthCard
      title="Criar conta"
      description="Crie sua conta para começar a registrar suas medições de glicemia."
      footer={
        <>
          Já tem conta?{" "}
          <Link href="/entrar" className="font-medium text-brand-blue hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthCard>
  );
}
