import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";
import { Copy, Share2, X } from "lucide-react";

function randomToken() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 22);
}

export function InviteShareSheet({
  scope,
  eventId,
  onClose,
}: {
  scope: "network" | "event";
  eventId?: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!user) return;
    setBusy(true);
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
      const url = `${window.location.origin}/join/${token}`;
      setLink(url);
    } catch (err: any) {
      toast.error(err?.message || "Impossible de créer l'invitation");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    toast.success("Lien copié");
  }

  async function share() {
    if (!link) return;
    if (navigator.share) {
      try { await navigator.share({ url: link, title: "Rejoignez-moi sur Memories" }); } catch {}
    } else {
      copy();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-card p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-xl">
            {scope === "event" ? "Inviter à cet événement" : "Inviter un ami"}
          </h3>
          <button onClick={onClose} aria-label="Fermer"><X className="h-5 w-5" /></button>
        </div>
        <p className="text-sm text-muted-foreground">
          {scope === "event"
            ? "Toute personne avec ce lien pourra rejoindre l'événement et voir les photos."
            : "Envoyez ce lien pour ajouter quelqu'un à votre cercle. Cette personne verra les événements auxquels vous l'invitez."}
        </p>
        {!link ? (
          <button
            onClick={create}
            disabled={busy}
            className="mt-5 w-full rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Création du lien…" : "Créer le lien d'invitation"}
          </button>
        ) : (
          <>
            <div className="mt-4 rounded-xl border border-border bg-background px-3 py-2 text-xs break-all">
              {link}
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={copy} className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-sm">
                <Copy className="h-4 w-4" /> Copier
              </button>
              <button onClick={share} className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                <Share2 className="h-4 w-4" /> Partager
              </button>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">Le lien expire dans 30 jours.</p>
          </>
        )}
      </div>
    </div>
  );
}
