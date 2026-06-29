import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";
import { Copy, Mail, MessageCircle, Send, Share2, X, Loader2 } from "lucide-react";

function randomToken() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 22);
}

export function InviteShareSheet({
  scope,
  eventId,
  eventName,
  onClose,
}: {
  scope: "network" | "event";
  eventId?: string;
  eventName?: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-create the invite link on mount
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const token = randomToken();
        const { error } = await supabase.from("invites").insert({
          token,
          inviter_id: user.id,
          scope,
          event_id: scope === "event" ? eventId : null,
          expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
        });
        if (error) throw error;
        if (!cancelled) setLink(`${window.location.origin}/join/${token}`);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Impossible de créer l'invitation");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, scope, eventId]);

  const message = scope === "event" && eventName
    ? `Rejoins-moi sur Memories pour partager les photos de « ${eventName} » :`
    : `Rejoins-moi sur Memories pour partager nos souvenirs :`;
  const fullText = link ? `${message} ${link}` : "";

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    toast.success("Lien copié");
  }

  async function nativeShare() {
    if (!link) return;
    if (navigator.share) {
      try {
        await navigator.share({ url: link, text: message, title: "Memories" });
      } catch {}
    } else {
      copy();
    }
  }

  const ready = !!link;
  const canNativeShare = typeof navigator !== "undefined" && !!(navigator as any).share;

  const emailSubject = scope === "event" && eventName
    ? `Photos « ${eventName} »`
    : "Rejoins-moi sur Memories";

  type ShareAction = {
    key: string;
    label: string;
    icon: React.ReactNode;
    bg: string;
    href?: string;
    target?: string;
    onClick?: () => void;
  };

  const actions: ShareAction[] = [
    {
      key: "copy",
      label: "Copier",
      icon: <Copy className="h-6 w-6" />,
      bg: "bg-muted text-foreground",
      onClick: copy,
    },
    {
      key: "whatsapp",
      label: "WhatsApp",
      icon: <MessageCircle className="h-6 w-6" />,
      bg: "bg-[#25D366] text-white",
      href: link ? `https://wa.me/?text=${encodeURIComponent(fullText)}` : "#",
      target: "_blank",
    },
    {
      key: "telegram",
      label: "Telegram",
      icon: <Send className="h-6 w-6" />,
      bg: "bg-[#229ED9] text-white",
      href: link
        ? `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(message)}`
        : "#",
      target: "_blank",
    },
    {
      key: "sms",
      label: "SMS",
      icon: <MessageCircle className="h-6 w-6" />,
      bg: "bg-emerald-500 text-white",
      href: link ? `sms:?&body=${encodeURIComponent(fullText)}` : "#",
    },
    {
      key: "email",
      label: "E-mail",
      icon: <Mail className="h-6 w-6" />,
      bg: "bg-amber-500 text-white",
      href: link
        ? `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(fullText)}`
        : "#",
    },
    ...(canNativeShare
      ? [
          {
            key: "share",
            label: "Partager…",
            icon: <Share2 className="h-6 w-6" />,
            bg: "bg-primary text-primary-foreground",
            onClick: nativeShare,
          } as ShareAction,
        ]
      : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl bg-card p-5 pb-6 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-display text-xl">
            {scope === "event" ? "Inviter à cet événement" : "Inviter un ami"}
          </h3>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          {scope === "event"
            ? "Partagez ce lien pour inviter quelqu'un à voir et ajouter des photos."
            : "Partagez ce lien pour ajouter quelqu'un à votre cercle."}
        </p>

        {/* Actions grid */}
        <div className="mt-5 grid grid-cols-4 gap-3 sm:grid-cols-5">
          {actions.map((a) => {
            const content = (
              <>
                <span
                  className={`relative flex h-14 w-14 items-center justify-center rounded-full ${a.bg} shadow-sm transition active:scale-95`}
                >
                  {ready ? a.icon : <Loader2 className="h-5 w-5 animate-spin" />}
                </span>
                <span className="text-[11px] text-muted-foreground">{a.label}</span>
              </>
            );
            const cls = `flex flex-col items-center gap-1.5 ${ready ? "" : "pointer-events-none opacity-50"}`;
            if (a.href) {
              return (
                <a
                  key={a.key}
                  href={a.href}
                  target={a.target}
                  rel={a.target === "_blank" ? "noopener noreferrer" : undefined}
                  aria-disabled={!ready}
                  className={cls}
                >
                  {content}
                </a>
              );
            }
            return (
              <button
                key={a.key}
                type="button"
                onClick={a.onClick}
                disabled={!ready}
                className={cls}
              >
                {content}
              </button>
            );
          })}
        </div>

        {/* Link preview */}
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
          <span className="flex-1 truncate text-xs text-muted-foreground">
            {link ?? (error ? error : "Génération du lien…")}
          </span>
          {link && (
            <button
              onClick={copy}
              className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
            >
              Copier
            </button>
          )}
        </div>

        <p className="mt-3 text-center text-[11px] text-muted-foreground">Le lien expire dans 30 jours.</p>
      </div>
    </div>
  );
}
