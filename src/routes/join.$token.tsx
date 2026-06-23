import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useServerFn } from "@tanstack/react-start";
import { redeemInvite } from "@/lib/invites.functions";
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
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (loading || done) return;
    if (!user) return;
    setBusy(true);
    redeem({ data: { token } })
      .then((res: any) => {
        setDone(true);
        toast.success("C'est bon, vous êtes inscrit !");
        if (res?.event_id) navigate({ to: "/events/$id", params: { id: res.event_id } });
        else navigate({ to: "/events" });
      })
      .catch((err) => toast.error(err?.message || "Impossible d'accepter l'invitation"))
      .finally(() => setBusy(false));
  }, [user, loading, token, redeem, navigate, done]);

  if (!loading && !user) {
    const redirect = `/join/${token}`;
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="font-display text-3xl">Vous avez été invité</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Créez un compte ou connectez-vous pour accepter cette invitation.
        </p>
        <div className="mt-6 space-y-2">
          <Link
            to="/auth"
            search={{ mode: "signup", redirect }}
            className="block w-full rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
          >
            Créer un compte
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signin", redirect }}
            className="block w-full rounded-full border border-border bg-card px-5 py-3 text-sm font-medium"
          >
            J'ai déjà un compte
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <h1 className="font-display text-2xl">{busy ? "Acceptation en cours…" : "Un instant"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">On vous ajoute, ça arrive.</p>
      </div>
    </div>
  );
}
