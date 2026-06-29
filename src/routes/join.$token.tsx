import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { getInvitePreview, redeemInvite } from "@/lib/invites.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/join/$token")({
  head: () => ({ meta: [{ title: "Rejoindre — Memories" }] }),
  component: JoinPage,
});

function JoinPage() {
  const { token } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const redeem = useServerFn(redeemInvite);
  const preview = useServerFn(getInvitePreview);
  const queryClient = useQueryClient();
  const [done, setDone] = useState(false);
  const [info, setInfo] = useState<{
    valid: boolean;
    scope?: "network" | "event";
    event_name?: string | null;
    inviter_name?: string | null;
  } | null>(null);

  // Fetch invite preview once
  useEffect(() => {
    preview({ data: { token } })
      .then((r: any) => setInfo(r))
      .catch(() => setInfo({ valid: false }));
  }, [token, preview]);

  // Redeem automatically once signed in
  useEffect(() => {
    if (loading || done || !user) return;
    setDone(true);
    redeem({ data: { token } })
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
      .catch((err) => toast.error(err?.message || "Impossible d'accepter l'invitation"));
  }, [user, loading, token, redeem, navigate, done, queryClient]);

  // Already signed in → spinner while redeeming
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

  // Invite invalid
  if (info && !info.valid) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="font-display text-3xl">Invitation invalide</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Ce lien a expiré ou n'est plus valide. Demandez-en un nouveau à la personne qui vous a invité.
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

  const redirect = `/join/${token}`;
  const isEvent = info?.scope === "event";
  const banner = info
    ? isEvent && info.event_name
      ? `${info.inviter_name ? info.inviter_name + " vous invite" : "Vous êtes invité"} à « ${info.event_name} »`
      : info.inviter_name
        ? `${info.inviter_name} vous invite à rejoindre son cercle`
        : "Vous avez été invité"
    : "Chargement de l'invitation…";

  // Mirror of the landing page, with an invite banner on top
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
          <p className="mt-4 text-base text-muted-foreground">
            Rejoignez en un clic. Aucun e-mail requis pour commencer.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            to="/auth"
            search={{ mode: "guest", redirect }}
            className="block w-full rounded-full bg-primary px-5 py-3.5 text-center text-base font-medium text-primary-foreground"
          >
            Commencer
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signin", redirect }}
            className="block w-full text-center text-sm text-muted-foreground underline"
          >
            J'ai déjà un compte
          </Link>
          <p className="pt-2 text-center text-xs text-muted-foreground">
            En continuant, vous acceptez notre{" "}
            <Link to="/privacy" className="underline">politique de confidentialité</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
