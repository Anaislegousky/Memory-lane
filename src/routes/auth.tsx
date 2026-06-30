import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup", "guest"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Connexion — Memories" }] }),
  component: AuthPage,
});

const signupSchema = z.object({
  display_name: z.string().trim().min(2, "Au moins 2 caractères").max(60),
  email: z.string().trim().email("E-mail invalide").max(255),
  password: z.string().min(8, "Utilisez au moins 8 caractères").max(72),
});
const signinSchema = z.object({
  email: z.string().trim().email("E-mail invalide"),
  password: z.string().min(1),
});
const guestSchema = z.object({
  display_name: z.string().trim().min(2, "Au moins 2 caractères").max(60),
});

function getSafeRedirect(redirect: string | undefined) {
  if (!redirect || !redirect.startsWith("/") || redirect.startsWith("/auth")) return "/events";
  return redirect;
}

function AuthPage() {
  const search = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup" | "guest">(
    search.mode === "guest" ? "signup" : (search.mode ?? "signup"),
  );
  const [busy, setBusy] = useState(false);
  const redirectTo = getSafeRedirect(search.redirect);

  useEffect(() => {
    if (!loading && user) navigate({ to: redirectTo, replace: true });
  }, [user, loading, navigate, redirectTo]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      if (mode === "guest") {
        const v = guestSchema.parse({ display_name: fd.get("display_name") });
        const { data, error } = await supabase.auth.signInAnonymously({
          options: { data: { display_name: v.display_name } },
        });
        if (error) throw error;
        if (data.user) {
          await supabase.from("profiles").upsert({ id: data.user.id, display_name: v.display_name });
        }
        toast.success(`Bienvenue ${v.display_name} !`);
        navigate({ to: redirectTo, replace: true });
      } else if (mode === "signup") {
        const v = signupSchema.parse({
          display_name: fd.get("display_name"),
          email: fd.get("email"),
          password: fd.get("password"),
        });
        const { data, error } = await supabase.auth.signUp({
          email: v.email,
          password: v.password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: { display_name: v.display_name },
          },
        });
        if (error) throw error;
        if (data.user) {
          await supabase.from("profiles").upsert({ id: data.user.id, display_name: v.display_name });
        }
        if (!data.session) {
          toast.success("Compte créé. Vérifiez votre e-mail pour confirmer.");
        } else {
          toast.success("Bienvenue !");
          navigate({ to: redirectTo, replace: true });
        }
      } else {
        const v = signinSchema.parse({ email: fd.get("email"), password: fd.get("password") });
        const { error } = await supabase.auth.signInWithPassword(v);
        if (error) throw error;
        navigate({ to: redirectTo, replace: true });
      }
    } catch (err: any) {
      toast.error(err?.message || "Une erreur est survenue");
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "guest" ? "Continuer en invité" : mode === "signup" ? "Créer votre compte" : "Bon retour";
  const subtitle =
    mode === "guest"
      ? "Aucun e-mail requis. Choisissez un prénom et c'est parti."
      : mode === "signup"
        ? "Nous avons juste besoin d'un e-mail et d'un nom que vos amis reconnaîtront."
        : "Connectez-vous pour retrouver vos événements et vos photos.";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-6 py-10">
        <Link to="/" className="text-sm text-muted-foreground">← Retour</Link>
        <h1 className="mt-4 font-display text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          {(mode === "signup" || mode === "guest") && (
            <Field
              name="display_name"
              label={mode === "guest" ? "Votre prénom ou pseudo" : "Nom d'affichage"}
              placeholder="Alex"
              autoComplete="nickname"
            />
          )}
          {mode !== "guest" && (
            <>
              <Field name="email" type="email" label="E-mail" placeholder="vous@exemple.com" autoComplete="email" />
              <Field
                name="password"
                type="password"
                label="Mot de passe"
                placeholder={mode === "signup" ? "Au moins 8 caractères" : "Votre mot de passe"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </>
          )}
          <button
            disabled={busy}
            className="w-full rounded-full bg-primary px-5 py-3.5 text-base font-medium text-primary-foreground disabled:opacity-60"
          >
            {busy
              ? "Veuillez patienter…"
              : mode === "guest"
                ? "Continuer"
                : mode === "signup"
                  ? "Créer le compte"
                  : "Se connecter"}
          </button>
        </form>

        {/* Mode switcher */}
        <div className="mt-6 space-y-2 text-center text-sm">
          {mode !== "signin" && (
            <button
              onClick={() => setMode("signin")}
              className="block w-full text-muted-foreground underline"
            >
              J'ai déjà un compte
            </button>
          )}
          {mode !== "signup" && (
            <button
              onClick={() => setMode("signup")}
              className="block w-full text-muted-foreground underline"
            >
              Créer un compte avec e-mail
            </button>
          )}
        </div>

        {mode === "signin" && (
          <button
            onClick={async () => {
              const email = (document.querySelector<HTMLInputElement>('input[name="email"]')?.value || "").trim();
              if (!email) return toast.error("Saisissez votre e-mail d'abord");
              const { error } = await supabase.auth.resend({
                type: "signup",
                email,
                options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
              });
              if (error) toast.error(error.message);
              else toast.success("E-mail de confirmation renvoyé");
            }}
            className="mt-3 w-full text-center text-xs text-muted-foreground underline"
          >
            Renvoyer l'e-mail de confirmation
          </button>
        )}
      </div>
    </div>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input
        {...rest}
        required
        className="w-full rounded-xl border border-input bg-card px-4 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}
