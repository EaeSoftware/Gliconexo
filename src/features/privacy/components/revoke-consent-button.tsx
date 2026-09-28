"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { revokeTermsConsent } from "@/lib/supabase/consent";
import { Button } from "@/components/ui/button";

export function RevokeConsentButton() {
  const [isRevoking, setIsRevoking] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleRevoke() {
    setIsRevoking(true);
    setStatus(null);
    try {
      const supabase = createClient();
      await revokeTermsConsent(supabase);
      setStatus(
        "Consentimento revogado. Isso não apaga suas medições já registradas — use \"Excluir conta\" para isso.",
      );
    } finally {
      setIsRevoking(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="outline" disabled={isRevoking} onClick={handleRevoke}>
        {isRevoking ? "Revogando..." : "Revogar consentimento"}
      </Button>
      {status ? (
        <p role="status" className="text-sm text-foreground/70">
          {status}
        </p>
      ) : null}
    </div>
  );
}
