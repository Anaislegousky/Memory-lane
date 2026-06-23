import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { Camera, MapPin, Users } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Memories — Partagez vos souvenirs entre proches" },
      {
        name: "description",
        content: "Un espace privé et sur invitation pour rassembler les photos de vos événements avec ceux qui y étaient.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/events" />;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-[0.18em] text-primary">Memories</p>
          <h1 className="mt-3 font-display text-5xl leading-[1.05] tracking-tight">
            Gardez les moments qui comptent,{" "}
            <span className="text-primary">ensemble</span>.
          </h1>
          <p className="mt-5 text-base text-muted-foreground">
            Un petit espace privé pour rassembler les photos de vos événements avec les amis qui
            étaient vraiment là. Pas de fil d'actualité, pas de pub, pas d'inconnus.
          </p>

          <div className="mt-10 space-y-4">
            <Feature icon={<Camera className="h-5 w-5" />} title="Toutes vos photos au même endroit" desc="Déposez vos photos dans l'événement auquel elles appartiennent." />
            <Feature icon={<MapPin className="h-5 w-5" />} title="Revoyez où vous êtes allés" desc="Chaque événement épinglé sur votre carte partagée." />
            <Feature icon={<Users className="h-5 w-5" />} title="Sur invitation uniquement" desc="Seules les personnes que vous invitez peuvent rejoindre ou voir quoi que ce soit." />
          </div>
        </div>

        <div className="mt-10 space-y-3">
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="block w-full rounded-full bg-primary px-5 py-3.5 text-center text-base font-medium text-primary-foreground"
          >
            Créer un compte
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signin" }}
            className="block w-full rounded-full border border-border bg-card px-5 py-3.5 text-center text-base font-medium"
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

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-primary">
        {icon}
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
