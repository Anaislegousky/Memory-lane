import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/components/AuthProvider";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Memories — Partagez vos souvenirs entre proches" },
      {
        name: "description",
        content: "Un espace privé sur invitation pour rassembler les photos de vos événements.",
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
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-12">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-[0.18em] text-primary">Memories</p>
          <h1 className="mt-4 font-display text-5xl leading-[1.05] tracking-tight">
            Vos souvenirs,{" "}
            <span className="text-primary">ensemble</span>.
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            Rassemblez les photos de vos événements avec les amis qui étaient là. Privé, sans pub.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            to="/auth"
            search={{ mode: "guest" }}
            className="block w-full rounded-full bg-primary px-5 py-3.5 text-center text-base font-medium text-primary-foreground"
          >
            Commencer
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signin" }}
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
