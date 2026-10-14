import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { Bug, Lightbulb, MessageCircle, MessageSquare } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { sendFeedback } from "@/lib/feedback.functions";

// Événement que n'importe quel bouton de l'app peut envoyer pour ouvrir le formulaire.
export const OPEN_FEEDBACK_EVENT = "memories:open-feedback";

const KINDS = [
  { value: "bug", label: "Bug", icon: Bug },
  { value: "idea", label: "Idée", icon: Lightbulb },
  { value: "other", label: "Autre", icon: MessageCircle },
] as const;

type Kind = (typeof KINDS)[number]["value"];

const PLACEHOLDER: Record<Kind, string> = {
  bug: "Qu'est-ce qui ne marche pas ? Que faisiez-vous juste avant ?",
  idea: "Qu'aimeriez-vous pouvoir faire dans Memories ?",
  other: "Dites-nous tout…",
};

/** Bouton flottant présent sur toutes les pages + formulaire d'envoi. */
export function FeedbackButton() {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("bug");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_FEEDBACK_EVENT, show);
    return () => window.removeEventListener(OPEN_FEEDBACK_EVENT, show);
  }, []);

  function onOpenChange(value: boolean) {
    setOpen(value);
    if (!value) setSent(false);
  }

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
          page: pathname,
        },
      });
      setSent(true);
    } catch (err) {
      toast.error(
        err instanceof Error && err.message.startsWith("Trop")
          ? err.message
          : "Message non envoyé, vérifiez les champs et réessayez.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Signaler un bug ou proposer une idée"
        className="fixed bottom-24 right-4 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/95 text-muted-foreground shadow-md backdrop-blur active:scale-95"
      >
        <MessageSquare className="h-5 w-5" />
      </button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto rounded-2xl">
          {sent ? (
            <DialogHeader className="py-4 text-center sm:text-center">
              <DialogTitle className="font-display text-2xl">Merci !</DialogTitle>
              <DialogDescription>
                Votre message est bien arrivé. Il nous aide à améliorer Memories.
              </DialogDescription>
            </DialogHeader>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">Un souci ? Une idée ?</DialogTitle>
                <DialogDescription>Dites-le nous, cela prend 30 secondes.</DialogDescription>
              </DialogHeader>

              <div
                className="grid grid-cols-3 gap-2"
                role="radiogroup"
                aria-label="Type de message"
              >
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
                  rows={5}
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
                Ne mettez ni mot de passe ni information sensible. Nous enregistrons aussi la page
                où vous étiez et le type d'appareil pour comprendre les bugs, jamais vos photos.
              </p>

              <button
                disabled={sending}
                className="w-full rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {sending ? "Envoi…" : "Envoyer"}
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
