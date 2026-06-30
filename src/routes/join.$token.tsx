import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useAuth } from "@/components/AuthProvider";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getInvitePreview, redeemInvite } from "@/lib/invites.functions";
import { toast } from "sonner";

const searchSchema = z.object({
  code: z.string().optional(),
});

export const Route = createFileRoute("/join/$token")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Rejoindre — Memories" }] }),
  component: JoinPage,
});

type Mode = "choice" | "guest";

function JoinPage() {
  const { token } = Route.useParams();
  const search = useSearch({ from: "/join/$token" });
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const redeem = useServerFn(redeemInvite);
  const preview = useServerFn(getInvitePreview);
  const queryClient = useQueryClient();
  const [done, setDone] = useState(false);
  const [mode, setMode] = useState<Mode>("choice");
  const [pseudo, setPseudo] = useState("");
  const [manualCode, setManualCode] = useState((search.code || "").toUpperCase());
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<
    | {
        valid: true;
        scope?: "network" | "event";
        event_name?: string | null;
        inviter_name?: string | null;
        code_required?: boolean;
      }
    | { valid: false; reason?: "not_found" | "expired" | "exhausted" }
    | null
  >(null);

  // Fetch invite preview
  useEffect(() => {
    preview({ data: { token, code: manualCode || undefined } })
      .then((r: any) => setInfo(r))
      .catch(() => setInfo({ valid: false }));
  }, [token, manualCode, preview]);

  const code = (search.code || manualCode || "").toUpperCase();

  // Redeem automatically once signed in AND we have a valid code
  useEffect(() => {
    if (loading || done || !user || !info || !info.valid || info.code_required) return;
    if (!code || code.length !== 6) return;
    setDone(true);
    redeem({ data: { token, code } })
      .then(async (res: any) => {
        await queryClient.invalidateQueries({ queryKey: ["events"] });
        if (res?.event_id) {
          await queryClient.invalidateQueries({ queryKey: ["event", res.event_id] });
          await queryClient.invalidateQueries({ queryKey: ["event-members", res.event_id] });
        }
        toast.success("C'est bon, vous êtes inscrit !");
        if (res?.event_id) navigate({ to: "/events/$id", params: { id: res.event_id } });
        else navigate({ to: "/events" });
      })
      .catch((err) => {
        setDone(false);
        toast.error(err?.message || "Impossible d'accepter l'invitation");
      });
  }, [user, loading, token, code, info, redeem, navigate, done, queryClient]);

  // Invite invalid or code required
  if (info && !info.valid) {
    const reason =
      info.reason === "expired"
        ? "Ce lien a expiré."
        : info.reason === "exhausted"
          ? "Ce lien a atteint sa limite d'utilisations."
          : "Ce lien n'est pas valide.";
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="font-display text-3xl">Invitation invalide</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {reason} Demandez-en un nouveau à la personne qui vous a invité.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
        >
          Aller à l'accueil
        </Link>
      </div>
    );
  }

  // Already signed in but code missing → ask for code
  if (info?.valid && info.code_required) {
    return (
      <div className="mx-auto max-w-md px-6 py-16">
        <h1 className="font-display text-3xl">Code requis</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Saisissez le code d'accès à 6 caractères fourni avec le lien.
        </p>
        <input
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value.toUpperCase().slice(0, 6))}
          placeholder="ABC123"
          autoCapitalize="characters"
          className="mt-6 w-full rounded-2xl border border-input bg-card px-4 py-3 text-center font-mono text-2xl tracking-[0.3em] outline-none focus:border-primary"
        />
      </div>
    );
  }

  // Already signed in & code valid → redeem in progress
  if (user) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <h1 className="font-display text-2xl">Acceptation en cours…</h1>
          <p className="mt-2 text-sm text-muted-foreground">On vous ajoute, ça arrive.</p>
        </div>
      </div>
    );
  }

  const isEvent = info?.valid && info.scope === "event";
  const banner = info?.valid
    ? isEvent && info.event_name
      ? `${info.inviter_name ? info.inviter_name + " vous invite" : "Vous êtes invité"} à « ${info.event_name} »`
      : info.inviter_name
        ? `${info.inviter_name} vous invite à rejoindre son cercle`
        : "Vous avez été invité"
    : "Chargement de l'invitation…";

  const redirect = `/join/${token}?code=${code}`;

  async function continueAsGuest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const display_name = pseudo.trim();
    if (display_name.length < 2) {
      toast.error("Choisissez un prénom (au moins 2 caractères)");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInAnonymously({
        options: { data: { display_name } },
      });
      if (error) throw error;
      if (data.user) {
        await supabase.from("profiles").upsert({ id: data.user.id, display_name });
      }
      toast.success(`Bienvenue ${display_name} !`);
      // Redeem will happen via the useEffect above once `user` is set.
    } catch (err: any) {
      toast.error(err?.message || "Une erreur est survenue");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-12">
        <div className="flex-1">
          <div className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
            <p className="text-xs uppercase tracking-[0.18em] text-primary">Invitation</p>
            <p className="mt-1 font-medium">{banner}</p>
          </div>

          <p className="mt-8 text-xs uppercase tracking-[0.18em] text-primary">Memories</p>
          <h1 className="mt-4 font-display text-5xl leading-[1.05] tracking-tight">
            Vos souvenirs, <span className="text-primary">ensemble</span>.
          </h1>

          {mode === "choice" ? (
            <p className="mt-4 text-base text-muted-foreground">
              Rejoignez en quelques secondes — créez un compte ou continuez en invité.
            </p>
          ) : (
            <form onSubmit={continueAsGuest} className="mt-6 space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Votre prénom ou pseudo</span>
                <input
                  value={pseudo}
                  onChange={(e) => setPseudo(e.target.value)}
                  placeholder="Alex"
                  autoComplete="nickname"
                  required
                  className="w-full rounded-xl border border-input bg-card px-4 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <button
                disabled={busy}
                className="w-full rounded-full bg-primary px-5 py-3.5 text-base font-medium text-primary-foreground disabled:opacity-60"
              >
                {busy ? "Veuillez patienter…" : "Rejoindre l'événement"}
              </button>
              <button
                type="button"
                onClick={() => setMode("choice")}
                className="block w-full text-center text-sm text-muted-foreground underline"
              >
                Retour
              </button>
            </form>
          )}
        </div>

        {mode === "choice" && (
          <div className="space-y-3">
            <Link
              to="/auth"
              search={{ mode: "signup", redirect }}
              className="block w-full rounded-full bg-primary px-5 py-3.5 text-center text-base font-medium text-primary-foreground"
            >
              Créer un compte
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signin", redirect }}
              className="block w-full text-center text-sm text-muted-foreground underline"
            >
              J'ai déjà un compte
            </Link>
            <button
              onClick={() => setMode("guest")}
              className="block w-full text-center text-sm text-muted-foreground underline"
            >
              Continuer en tant qu'invité
            </button>
            <p className="pt-2 text-center text-xs text-muted-foreground">
              En continuant, vous acceptez notre{" "}
              <Link to="/privacy" className="underline">politique de confidentialité</Link>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
