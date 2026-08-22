import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Gamepad2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { auth, db, googleProvider } from "@/firebase";

type AuthSearch = {
  redirect: string | undefined;
};

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    redirect:
      typeof search["redirect"] === "string"
        ? search["redirect"]
        : undefined,
  }),

  head: () => ({
    meta: [
      { title: "Entrar ou criar conta — GameHub" },
      {
        name: "description",
        content:
          "Acesse sua conta GameHub para personalizar seu perfil e preparar seus favoritos e histórico de jogos.",
      },
      {
        property: "og:title",
        content: "Entrar ou criar conta — GameHub",
      },
      {
        property: "og:description",
        content: "Cadastro e login do portal gamer GameHub.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
    ],
  }),

  component: AuthPage,
});

const emailSchema = z
  .string()
  .trim()
  .email({ message: "Informe um e-mail válido" })
  .max(255);

const passwordSchema = z
  .string()
  .min(8, { message: "A senha deve ter pelo menos 8 caracteres" })
  .max(72, { message: "A senha deve ter no máximo 72 caracteres" });

const nameSchema = z
  .string()
  .trim()
  .min(2, { message: "Informe seu nome (mín. 2 caracteres)" })
  .max(60, { message: "O nome deve ter no máximo 60 caracteres" });

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const { user, loading: sessionLoading } = useAuth();

  const target =
    redirect && redirect.startsWith("/")
      ? redirect
      : "/perfil";

  useEffect(() => {
    if (!sessionLoading && user) {
      navigate({
        to: target,
        replace: true,
      });
    }
  }, [sessionLoading, user, target, navigate]);

  const [tab, setTab] = useState<"login" | "signup">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [busy, setBusy] = useState<
    "login" | "signup" | "google" | null
  >(null);

  const reset = () => {
    setErrors({});
    setFormError(null);
    setNotice(null);
  };

  const switchTab = (value: string) => {
    reset();
    setTab(value === "signup" ? "signup" : "login");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();

    const next: Record<string, string> = {};

    const emailResult = emailSchema.safeParse(email);

    if (!emailResult.success) {
      next["email"] = emailResult.error.issues[0]!.message;
    }

    if (!password) {
      next["password"] = "Informe sua senha";
    }

    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    const emailValue = emailResult.data;

    if (!emailValue) {
      setErrors({
        email: "Informe um e-mail válido",
      });
      return;
    }

    setBusy("login");

    try {
      await signInWithEmailAndPassword(
        auth,
        emailValue,
        password,
      );

      navigate({
        to: target,
        replace: true,
      });
    } catch (error) {
      console.error("Erro no login:", error);

      const code =
        error &&
        typeof error === "object" &&
        "code" in error
          ? String(error.code)
          : "";

      setFormError(
        code === "auth/user-not-found" ||
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential"
          ? "E-mail ou senha incorretos."
          : "Não foi possível entrar. Tente novamente.",
      );
    } finally {
      setBusy(null);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();

    const next: Record<string, string> = {};

    const nameResult = nameSchema.safeParse(name);
    const emailResult = emailSchema.safeParse(email);
    const passResult = passwordSchema.safeParse(password);

    if (!nameResult.success) {
      next["name"] = nameResult.error.issues[0]!.message;
    }

    if (!emailResult.success) {
      next["email"] = emailResult.error.issues[0]!.message;
    }

    if (!passResult.success) {
      next["password"] = passResult.error.issues[0]!.message;
    }

    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    const nameValue = nameResult.data;
    const emailValue = emailResult.data;
    const passwordValue = passResult.data;

    if (!nameValue || !emailValue || !passwordValue) {
      setFormError("Verifique os dados informados.");
      return;
    }

    setBusy("signup");

    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        emailValue,
        passwordValue,
      );

      await updateProfile(credential.user, {
        displayName: nameValue,
      });

      await setDoc(
        doc(db, "profiles", credential.user.uid),
        {
          id: credential.user.uid,
          display_name: nameValue,
          avatar_url: credential.user.photoURL ?? null,
        },
        {
          merge: true,
        },
      );

      navigate({
        to: target,
        replace: true,
      });
    } catch (error) {
      console.error("Erro ao criar conta:", error);

      const code =
        error &&
        typeof error === "object" &&
        "code" in error
          ? String(error.code)
          : "";

      setFormError(
        code === "auth/email-already-in-use"
          ? "Este e-mail já possui uma conta. Faça login."
          : code === "auth/weak-password"
            ? "Esta senha é muito fraca. Escolha uma senha mais forte."
            : code === "auth/invalid-email"
              ? "Informe um e-mail válido."
              : "Não foi possível criar sua conta. Tente novamente.",
      );
    } finally {
      setBusy(null);
    }
  };

  const handleGoogle = async () => {
    reset();
    setBusy("google");

    try {
      const result = await signInWithPopup(
        auth,
        googleProvider,
      );

      await setDoc(
        doc(db, "profiles", result.user.uid),
        {
          id: result.user.uid,
          display_name: result.user.displayName ?? null,
          avatar_url: result.user.photoURL ?? null,
        },
        {
          merge: true,
        },
      );

      navigate({
        to: target,
        replace: true,
      });
    } catch (error) {
      console.error("Erro no Google Login:", error);

      setFormError(
        "Não foi possível entrar com o Google. Tente novamente.",
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div
        className="grid-glow pointer-events-none absolute inset-0"
        aria-hidden
      />

      <div className="relative w-full max-w-md">
        <Link
          to="/"
          className="mb-6 flex items-center justify-center gap-2"
        >
          <span className="grid size-9 place-items-center rounded-lg bg-gradient-violet shadow-glow">
            <Gamepad2 className="size-5 text-primary-foreground" />
          </span>

          <span className="font-display text-xl font-extrabold tracking-tight">
            GAME
            <span className="text-gradient-violet">
              HUB
            </span>
          </span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
          <h1 className="font-display text-2xl font-extrabold uppercase">
            Sua conta GameHub
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Entre ou cadastre-se para personalizar seu perfil.
          </p>

          <Tabs
            value={tab}
            onValueChange={switchTab}
            className="mt-6"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">
                Entrar
              </TabsTrigger>

              <TabsTrigger value="signup">
                Criar conta
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="login"
              className="mt-5"
            >
              <form
                onSubmit={handleLogin}
                className="space-y-4"
                noValidate
              >
                <Field
                  id="login-email"
                  label="E-mail"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  error={errors["email"]}
                  autoComplete="email"
                />

                <Field
                  id="login-password"
                  label="Senha"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  error={errors["password"]}
                  autoComplete="current-password"
                />

                <Button
                  type="submit"
                  variant="hero"
                  className="w-full"
                  disabled={busy !== null}
                >
                  {busy === "login" && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  Entrar
                </Button>
              </form>
            </TabsContent>

            <TabsContent
              value="signup"
              className="mt-5"
            >
              <form
                onSubmit={handleSignup}
                className="space-y-4"
                noValidate
              >
                <Field
                  id="signup-name"
                  label="Nome"
                  value={name}
                  onChange={setName}
                  error={errors["name"]}
                  autoComplete="name"
                />

                <Field
                  id="signup-email"
                  label="E-mail"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  error={errors["email"]}
                  autoComplete="email"
                />

                <Field
                  id="signup-password"
                  label="Senha"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  error={errors["password"]}
                  hint="Mínimo de 8 caracteres."
                  autoComplete="new-password"
                />

                <Button
                  type="submit"
                  variant="hero"
                  className="w-full"
                  disabled={busy !== null}
                >
                  {busy === "signup" && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  Criar conta
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {formError && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {formError}
            </p>
          )}

          {notice && (
            <p
              role="status"
              className="mt-4 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-foreground"
            >
              {notice}
            </p>
          )}

          <div className="my-6 flex items-center gap-3 text-xs uppercase text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            ou
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogle}
            disabled={busy !== null}
          >
            {busy === "google" && (
              <Loader2 className="size-4 animate-spin" />
            )}

            Continuar com Google
          </Button>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link
              to="/"
              className="hover:text-primary"
            >
              Voltar para o catálogo
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  type = "text",
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
  hint?: string | undefined;
  type?: string | undefined;
  autoComplete?: string | undefined;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>

      <Input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        className="bg-surface"
      />

      {error ? (
        <p className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}