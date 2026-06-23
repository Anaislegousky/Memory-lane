import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { Camera, MapPin, Users } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Memories — Share moments with your people" },
      {
        name: "description",
        content: "A private, invite-only space to gather photos from your events with the people who were there.",
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
            Keep the moments that matter,{" "}
            <span className="text-primary">together</span>.
          </h1>
          <p className="mt-5 text-base text-muted-foreground">
            A small, private space to gather photos from your events with the friends who were
            actually there. No feed, no ads, no strangers.
          </p>

          <div className="mt-10 space-y-4">
            <Feature icon={<Camera className="h-5 w-5" />} title="Photos in one place" desc="Drop pictures into the event they belong to." />
            <Feature icon={<MapPin className="h-5 w-5" />} title="See where you've been" desc="Every event pinned on your shared map." />
            <Feature icon={<Users className="h-5 w-5" />} title="Invite-only" desc="Only people you invite can join or see anything." />
          </div>
        </div>

        <div className="mt-10 space-y-3">
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="block w-full rounded-full bg-primary px-5 py-3.5 text-center text-base font-medium text-primary-foreground"
          >
            Create your account
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signin" }}
            className="block w-full rounded-full border border-border bg-card px-5 py-3.5 text-center text-base font-medium"
          >
            I already have an account
          </Link>
          <p className="pt-2 text-center text-xs text-muted-foreground">
            By continuing you agree to our{" "}
            <Link to="/privacy" className="underline">Privacy Policy</Link>.
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
