import { describe, expect, it } from "vitest";
import { signupSchema, loginSchema } from "@/features/auth/schemas";

describe("signupSchema", () => {
  const base = {
    email: "paciente@example.com",
    password: "senha1234",
    confirmPassword: "senha1234",
    acceptedTerms: true as const,
  };

  it("aceita dados válidos com senhas coincidentes e termos aceitos", () => {
    expect(signupSchema.safeParse(base).success).toBe(true);
  });

  it("rejeita quando as senhas não coincidem", () => {
    const result = signupSchema.safeParse({ ...base, confirmPassword: "outrasenha" });
    expect(result.success).toBe(false);
  });

  it("rejeita senha com menos de 8 caracteres", () => {
    const result = signupSchema.safeParse({
      ...base,
      password: "1234567",
      confirmPassword: "1234567",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita quando os termos não são aceitos", () => {
    const result = signupSchema.safeParse({ ...base, acceptedTerms: false });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("rejeita e-mail inválido", () => {
    const result = loginSchema.safeParse({ email: "nao-e-email", password: "qualquer" });
    expect(result.success).toBe(false);
  });

  it("aceita e-mail e senha válidos", () => {
    const result = loginSchema.safeParse({
      email: "paciente@example.com",
      password: "qualquer",
    });
    expect(result.success).toBe(true);
  });
});
