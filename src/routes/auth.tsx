import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
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

function AuthPage() {
  const search = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signup");
  const [busy, setBusy] = useState(false);
  const redirectTo = search.redirect || "/events";

  useEffect(() => {
    if (!loading && user) navigate({ to: redirectTo, replace: true });
  }, [user, loading, navigate, redirectTo]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      if (mode === "signup") {
        const v = signupSchema.parse({
          display_name: fd.get("display_name"),
          email: fd.get("email"),
          password: fd.get("password"),
        });
        const { data, error } = await supabase.auth.signUp({
          email: v.email,
          password: v.password,
          options: {
            emailRedirectTo: window.location.origin,
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
          navigate({ to: redirectTo });
        }
      } else {
        const v = signinSchema.parse({ email: fd.get("email"), password: fd.get("password") });
        const { error } = await supabase.auth.signInWithPassword(v);
        if (error) throw error;
        navigate({ to: redirectTo });
      }
    } catch (err: any) {
      toast.error(err?.message || "Une erreur est survenue");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-6 py-10">
        <Link to="/" className="text-sm text-muted-foreground">← Retour</Link>
        <h1 className="mt-4 font-display text-4xl">
          {mode === "signup" ? "Créer votre compte" : "Bon retour"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signup"
            ? "Nous avons juste besoin d'un e-mail et d'un nom que vos amis reconnaîtront."
            : "Connectez-vous pour retrouver vos événements et vos photos."}
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          {mode === "signup" && (
            <Field name="display_name" label="Nom d'affichage" placeholder="Alex" autoComplete="nickname" />
          )}
          <Field name="email" type="email" label="E-mail" placeholder="vous@exemple.com" autoComplete="email" />
          <Field
            name="password"
            type="password"
            label="Mot de passe"
            placeholder={mode === "signup" ? "Au moins 8 caractères" : "Votre mot de passe"}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
          <button
            disabled={busy}
            className="w-full rounded-full bg-primary px-5 py-3.5 text-base font-medium text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Veuillez patienter…" : mode === "signup" ? "Créer le compte" : "Se connecter"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
          className="mt-6 w-full text-center text-sm text-muted-foreground underline"
        >
          {mode === "signup" ? "J'ai déjà un compte" : "Créer un nouveau compte"}
        </button>
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
