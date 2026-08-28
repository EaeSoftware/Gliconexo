"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function onSignOut() {
    setIsLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } finally {
      router.push("/entrar");
      router.refresh();
    }
  }

  return (
    <Button type="button" variant="outline" disabled={isLoading} onClick={onSignOut}>
      {isLoading ? "Saindo..." : "Sair"}
    </Button>
  );
}
