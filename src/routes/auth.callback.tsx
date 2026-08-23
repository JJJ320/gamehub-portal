import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

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

        // Supabase pode retornar o código de PKCE aqui.
        const code = url.searchParams.get("code");

        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error(
              "Erro ao confirmar e-mail:",
              exchangeError,
            );

            if (mounted) {
              setError(
                "Não foi possível confirmar sua conta. O link pode ter expirado.",
              );
            }

            return;
          }
        }

        // Caso o Supabase já tenha criado/restaurado
        // a sessão diretamente.
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          if (mounted) {
            setError(
              "A confirmação foi concluída, mas não foi possível criar sua sessão.",
            );
          }

          return;
        }

        // A sessão já está salva no Supabase.
        // Agora manda o usuário direto para o perfil.
        await navigate({
          to: "/perfil",
          replace: true,
        });
      } catch (err) {
        console.error(
          "Erro inesperado no callback de autenticação:",
          err,
        );

        if (mounted) {
          setError(
            "Ocorreu um erro ao confirmar sua conta.",
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
          <h1 className="font-display text-2xl font-extrabold">
            Erro na confirmação
          </h1>

          <p className="mt-3 text-sm text-muted-foreground">
            {error}
          </p>

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

      <p className="text-sm text-muted-foreground">
        Confirmando sua conta...
      </p>
    </div>
  );
}