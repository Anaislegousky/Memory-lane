import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { AppShell } from "@/components/AppShell";
import { InviteShareSheet } from "@/components/InviteShareSheet";
import { useState } from "react";
import { toast } from "sonner";
import { LogOut, Share2, Download, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Memories" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [share, setShare] = useState(false);
  const [editing, setEditing] = useState(false);

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
    toast.success("Updated");
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
    const confirmed = confirm("Delete your account and ALL your data? This cannot be undone.");
    if (!confirmed) return;
    try {
      const { deleteMyAccount } = await import("@/lib/account.functions");
      await deleteMyAccount();
      await supabase.auth.signOut();
      toast.success("Account deleted");
      navigate({ to: "/", replace: true });
    } catch (err: any) {
      toast.error(err?.message || "Could not delete account");
    }
  }

  return (
    <AppShell title="Profile">
      <div className="space-y-6">
        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Signed in as</p>
          <p className="mt-1 text-sm">{user?.email}</p>
          <div className="mt-3">
            {!editing ? (
              <div className="flex items-center justify-between">
                <p className="font-display text-2xl">{profileQ.data?.display_name ?? "…"}</p>
                <button onClick={() => setEditing(true)} className="text-sm text-primary underline">
                  Edit
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
                <button className="rounded-full bg-primary px-3 py-2 text-sm text-primary-foreground">Save</button>
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
              <Share2 className="h-5 w-5" /> Invite a friend
            </span>
            <span className="text-xs text-muted-foreground">›</span>
          </button>

          <button
            onClick={exportData}
            className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 text-left"
          >
            <span className="flex items-center gap-3">
              <Download className="h-5 w-5" /> Export my data (JSON)
            </span>
            <span className="text-xs text-muted-foreground">›</span>
          </button>

          <button
            onClick={signOut}
            className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 text-left"
          >
            <span className="flex items-center gap-3">
              <LogOut className="h-5 w-5" /> Sign out
            </span>
          </button>

          <button
            onClick={deleteAccount}
            className="flex w-full items-center justify-between rounded-2xl border border-destructive/30 bg-card p-4 text-left text-destructive"
          >
            <span className="flex items-center gap-3">
              <Trash2 className="h-5 w-5" /> Delete my account
            </span>
          </button>
        </section>

        <p className="px-2 text-center text-xs text-muted-foreground">
          We only collect what's needed to run Memories. See our{" "}
          <a href="/privacy" className="underline">Privacy Policy</a>.
        </p>
      </div>
      {share && <InviteShareSheet scope="network" onClose={() => setShare(false)} />}
    </AppShell>
  );
}
