import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { applyActionCode, checkActionCode } from "firebase/auth";

import { auth } from "@/firebase";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const handleCallback = async () => {
      try {
        const url = new URL(window.location.href);
        const mode = url.searchParams.get("mode");
        const oobCode = url.searchParams.get("oobCode");

        if (oobCode && mode === "verifyEmail") {
          await checkActionCode(auth, oobCode);
          await applyActionCode(auth, oobCode);
        } else if (oobCode && mode === "resetPassword") {
          await checkActionCode(auth, oobCode);
        }

        if (!mounted) return;

        await navigate({
          to: "/auth",
          replace: true,
        });
      } catch (err) {
        console.error("Erro no callback de autenticação:", err);

        if (mounted) {
          setError(
            "Não foi possível concluir a confirmação. O link pode ter expirado ou já ter sido utilizado.",
          );
        }
      }
    };

    void handleCallback();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="font-display text-2xl font-extrabold">Erro na confirmação</h1>

          <p className="mt-3 text-sm text-muted-foreground">{error}</p>

          <button
            type="button"
            onClick={() =>
              navigate({
                to: "/auth",
                replace: true,
              })
            }
            className="mt-6 text-sm text-primary hover:underline"
          >
            Voltar para o login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Loader2 className="size-8 animate-spin text-primary" />

      <p className="text-sm text-muted-foreground">Confirmando sua conta...</p>
    </div>
  );
}
