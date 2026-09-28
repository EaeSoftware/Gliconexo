"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { clearActiveUserLocalData, setActiveUser } from "@/lib/db/schema";
import { SettingsButtonRow } from "@/components/ui/settings-row";

export function SignOutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function onSignOut() {
    setIsLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      // CLAUDE.md seção 13: dados locais privados devem ser removidos
      // após um logout concluído, para não ficarem visíveis a quem
      // usar o mesmo dispositivo em seguida.
      await clearActiveUserLocalData();
      setActiveUser(null);
    } finally {
      router.push("/entrar");
      router.refresh();
    }
  }

  return (
    <SettingsButtonRow
      icon={LogOut}
      label={isLoading ? "Saindo..." : "Sair"}
      tone="danger"
      disabled={isLoading}
      onClick={onSignOut}
    />
  );
}
