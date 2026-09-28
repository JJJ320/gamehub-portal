import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Gamepad2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { EmailAuthProvider, linkWithCredential } from "firebase/auth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/definir-senha")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Criar senha — GameHub" }],
  }),
  component: SetPasswordPage,
});

function SetPasswordPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      void navigate({
        to: "/auth",
        search: { redirect: "/definir-senha" },
        replace: true,
      });
    }
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const hasPassword = user.providerData.some((provider) => provider.providerId === "password");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    if (hasPassword) {
      setStatus({ ok: true, text: "Sua conta já possui uma senha. Você pode entrar com e-mail e senha." });
      return;
    }

    if (password.length < 8) {
      setStatus({ ok: false, text: "A senha deve ter pelo menos 8 caracteres." });
      return;
    }

    if (password !== confirmation) {
      setStatus({ ok: false, text: "As senhas não são iguais." });
      return;
    }

    if (!user.email) {
      setStatus({ ok: false, text: "Sua conta não possui um e-mail disponível." });
      return;
    }

    setSaving(true);

    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await linkWithCredential(user, credential);
      setPassword("");
      setConfirmation("");
      setStatus({
        ok: true,
        text: "Senha criada com sucesso! Agora você pode entrar usando seu e-mail e senha.",
      });
    } catch (error) {
      console.error("Erro ao criar senha:", error);
      setStatus({
        ok: false,
        text: "Não foi possível criar a senha. Se ela já estiver configurada, tente entrar com e-mail e senha.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="grid-glow pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-gradient-violet shadow-glow">
            <Gamepad2 className="size-5 text-primary-foreground" />
          </span>
          <span className="font-display text-xl font-extrabold tracking-tight">
            GAME<span className="text-gradient-violet">HUB</span>
          </span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-primary/10">
              <CheckCircle2 className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-extrabold uppercase">Criar senha</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          {hasPassword ? (
            <div className="mt-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Sua conta já está configurada para login com e-mail e senha.
              </p>
              <Button asChild variant="hero" className="w-full">
                <Link to="/auth">Ir para o login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Você entrou pelo Google. Crie uma senha para vincular o login por e-mail à mesma conta, sem criar outra conta.
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="password">Nova senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  placeholder="Mínimo de 8 caracteres"
                  className="bg-surface"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmation">Confirmar senha</Label>
                <Input
                  id="confirmation"
                  type="password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  autoComplete="new-password"
                  placeholder="Digite a senha novamente"
                  className="bg-surface"
                />
              </div>

              <Button type="submit" variant="hero" className="w-full" disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                Criar senha
              </Button>

              {status && (
                <p
                  role={status.ok ? "status" : "alert"}
                  className={status.ok
                    ? "rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm"
                    : "rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"}
                >
                  {status.text}
                </p>
              )}
            </form>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/perfil" className="inline-flex items-center gap-1 hover:text-primary">
              <ArrowLeft className="size-3" />
              Voltar para o perfil
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
