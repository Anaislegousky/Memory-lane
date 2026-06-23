import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { AppShell } from "@/components/AppShell";
import { InviteShareSheet } from "@/components/InviteShareSheet";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogOut, Share2, Download, Trash2, Bell } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profil — Memories" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [share, setShare] = useState(false);
  const [editing, setEditing] = useState(false);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported",
  );

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPerm(Notification.permission);
    }
  }, []);

  async function enableNotifications() {
    if (!("Notification" in window)) {
      toast.error("Notifications non disponibles sur cet appareil");
      return;
    }
    const res = await Notification.requestPermission();
    setNotifPerm(res);
    if (res === "granted") toast.success("Notifications activées");
    else if (res === "denied") toast.error("Vous avez refusé les notifications");
  }

  const profileQ = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, created_at")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  async function saveName(name: string) {
    const { error } = await supabase.from("profiles").update({ display_name: name }).eq("id", user!.id);
    if (error) return toast.error(error.message);
    toast.success("Mis à jour");
    setEditing(false);
    profileQ.refetch();
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function exportData() {
    const [profile, events, members, photos, tags, invites] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user!.id).single(),
      supabase.from("events").select("*").eq("owner_id", user!.id),
      supabase.from("event_members").select("*").eq("user_id", user!.id),
      supabase.from("photos").select("*").eq("uploader_id", user!.id),
      supabase.from("photo_tags").select("*").eq("tagger_id", user!.id),
      supabase.from("invites").select("*").eq("inviter_id", user!.id),
    ]);
    const blob = new Blob(
      [JSON.stringify({
        exported_at: new Date().toISOString(),
        user: { id: user!.id, email: user!.email },
        profile: profile.data,
        events_owned: events.data,
        event_memberships: members.data,
        photos: photos.data,
        tags_made: tags.data,
        invites: invites.data,
      }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `memories-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function deleteAccount() {
    const confirmed = confirm("Supprimer votre compte et TOUTES vos données ? Cette action est irréversible.");
    if (!confirmed) return;
    try {
      const { deleteMyAccount } = await import("@/lib/account.functions");
      await deleteMyAccount();
      await supabase.auth.signOut();
      toast.success("Compte supprimé");
      navigate({ to: "/", replace: true });
    } catch (err: any) {
      toast.error(err?.message || "Impossible de supprimer le compte");
    }
  }

  return (
    <AppShell title="Profil">
      <div className="space-y-6">
        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Connecté en tant que</p>
          <p className="mt-1 text-sm">{user?.email}</p>
          <div className="mt-3">
            {!editing ? (
              <div className="flex items-center justify-between">
                <p className="font-display text-2xl">{profileQ.data?.display_name ?? "…"}</p>
                <button onClick={() => setEditing(true)} className="text-sm text-primary underline">
                  Modifier
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  saveName(String(fd.get("display_name") || "").trim());
                }}
                className="flex gap-2"
              >
                <input
                  name="display_name"
                  defaultValue={profileQ.data?.display_name ?? ""}
                  className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm"
                />
                <button className="rounded-full bg-primary px-3 py-2 text-sm text-primary-foreground">Enregistrer</button>
              </form>
            )}
          </div>
        </section>

        <section className="space-y-2">
          <button
            onClick={() => setShare(true)}
            className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 text-left"
          >
            <span className="flex items-center gap-3">
              <Share2 className="h-5 w-5" /> Inviter un ami
            </span>
            <span className="text-xs text-muted-foreground">›</span>
          </button>

          <button
            onClick={exportData}
            className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 text-left"
          >
            <span className="flex items-center gap-3">
              <Download className="h-5 w-5" /> Exporter mes données (JSON)
            </span>
            <span className="text-xs text-muted-foreground">›</span>
          </button>

          <button
            onClick={enableNotifications}
            disabled={notifPerm === "granted" || notifPerm === "unsupported"}
            className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 text-left disabled:opacity-70"
          >
            <span className="flex items-center gap-3">
              <Bell className="h-5 w-5" />
              <span>
                <span className="block">Notifications</span>
                <span className="block text-xs text-muted-foreground">
                  {notifPerm === "granted"
                    ? "Activées — vous serez prévenu 7 jours avant la suppression des photos"
                    : notifPerm === "denied"
                      ? "Bloquées dans les réglages de votre navigateur"
                      : notifPerm === "unsupported"
                        ? "Non supportées par ce navigateur"
                        : "Soyez prévenu avant l'auto-suppression des photos"}
                </span>
              </span>
            </span>
            {notifPerm !== "granted" && notifPerm !== "unsupported" && (
              <span className="text-xs text-muted-foreground">›</span>
            )}
          </button>





          <button
            onClick={signOut}
            className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 text-left"
          >
            <span className="flex items-center gap-3">
              <LogOut className="h-5 w-5" /> Se déconnecter
            </span>
          </button>

          <button
            onClick={deleteAccount}
            className="flex w-full items-center justify-between rounded-2xl border border-destructive/30 bg-card p-4 text-left text-destructive"
          >
            <span className="flex items-center gap-3">
              <Trash2 className="h-5 w-5" /> Supprimer mon compte
            </span>
          </button>
        </section>

        <p className="px-2 text-center text-xs text-muted-foreground">
          Nous ne collectons que ce qui est nécessaire au fonctionnement de Memories. Consultez notre{" "}
          <a href="/privacy" className="underline">politique de confidentialité</a>.
        </p>
      </div>
      {share && <InviteShareSheet scope="network" onClose={() => setShare(false)} />}
    </AppShell>
  );
}
