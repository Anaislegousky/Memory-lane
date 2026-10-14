import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Bug, Lightbulb, MessageCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";
import { sendFeedback } from "@/lib/feedback.functions";

export const Route = createFileRoute("/_authenticated/feedback")({
  head: () => ({ meta: [{ title: "Un souci ? Une idée ? — Memories" }] }),
  component: FeedbackPage,
});

const KINDS = [
  { value: "bug", label: "Bug", icon: Bug },
  { value: "idea", label: "Idée", icon: Lightbulb },
  { value: "other", label: "Autre", icon: MessageCircle },
] as const;

const PLACEHOLDER: Record<(typeof KINDS)[number]["value"], string> = {
  bug: "Qu'est-ce qui ne marche pas ? Que faisiez-vous juste avant ?",
  idea: "Qu'aimeriez-vous pouvoir faire dans Memories ?",
  other: "Dites-nous tout…",
};

function FeedbackPage() {
  const { user } = useAuth();
  const [kind, setKind] = useState<(typeof KINDS)[number]["value"]>("bug");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSending(true);
    try {
      await sendFeedback({
        data: {
          kind,
          message: String(fd.get("message") || ""),
          contact_email: String(fd.get("contact_email") || ""),
        },
      });
      setSent(true);
    } catch (err) {
      toast.error(
        err instanceof Error && err.message.includes("Unauthorized")
          ? "Reconnectez-vous puis réessayez."
          : "Message non envoyé, vérifiez les champs.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <AppShell title="Un souci ? Une idée ?">
      <div className="space-y-4 py-4">
        {sent ? (
          <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5 text-center">
            <p className="font-display text-2xl">Merci !</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Votre message est bien arrivé. Il nous aide à améliorer Memories.
            </p>
            <Link
              to="/profile"
              className="mt-4 inline-block rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              Retour au profil
            </Link>
          </section>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Type de message">
              {KINDS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={kind === value}
                  onClick={() => setKind(value)}
                  className={`flex flex-col items-center gap-1 rounded-2xl border p-3 text-sm ${
                    kind === value ? "border-primary bg-primary/10" : "border-border bg-card"
                  }`}
                >
                  <Icon className="h-5 w-5" /> {label}
                </button>
              ))}
            </div>

            <label className="block text-sm">
              Votre message
              <textarea
                name="message"
                required
                minLength={5}
                maxLength={2000}
                rows={6}
                placeholder={PLACEHOLDER[kind]}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm">
              Votre e-mail{" "}
              <span className="text-muted-foreground">(facultatif, pour vous répondre)</span>
              <input
                name="contact_email"
                type="email"
                maxLength={254}
                defaultValue={user?.email ?? ""}
                placeholder="vous@exemple.com"
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              />
            </label>

            <p className="text-xs text-muted-foreground">
              Ne mettez ni mot de passe ni information sensible. Nous enregistrons aussi le type
              d'appareil et de navigateur pour comprendre les bugs, jamais vos photos.
            </p>

            <button
              disabled={sending}
              className="w-full rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {sending ? "Envoi…" : "Envoyer"}
            </button>
          </form>
        )}
      </div>
    </AppShell>
  );
}
