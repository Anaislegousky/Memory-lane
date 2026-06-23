import { useEffect, useMemo, useState } from "react";
import { signedUrlsFor } from "@/lib/photo-urls";
import { Tag as TagIcon, X, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";

export type Photo = {
  id: string;
  storage_path: string;
  uploader_id: string;
  created_at: string;
};

export type Member = { user_id: string; display_name: string };
export type Tag = { id: string; photo_id: string; tagged_user_id: string };

export function PhotoGallery({
  photos,
  members,
  tags,
  onChange,
  isOwner,
}: {
  photos: Photo[];
  members: Member[];
  tags: Tag[];
  onChange: () => void;
  isOwner: boolean;
}) {
  const { user } = useAuth();
  const [urls, setUrls] = useState<Map<string, string>>(new Map());
  const [open, setOpen] = useState<Photo | null>(null);

  useEffect(() => {
    const paths = photos.map((p) => p.storage_path);
    signedUrlsFor(paths).then(setUrls).catch(() => {});
  }, [photos]);

  const tagsByPhoto = useMemo(() => {
    const m = new Map<string, Tag[]>();
    tags.forEach((t) => {
      const arr = m.get(t.photo_id) ?? [];
      arr.push(t);
      m.set(t.photo_id, arr);
    });
    return m;
  }, [tags]);

  if (!photos.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 py-10 text-center text-sm text-muted-foreground">
        No photos yet. Be the first to add some.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-3">
        {photos.map((p) => {
          const u = urls.get(p.storage_path);
          return (
            <button
              key={p.id}
              onClick={() => setOpen(p)}
              className="relative aspect-square overflow-hidden rounded-lg bg-muted"
            >
              {u && (
                <img src={u} alt="" loading="lazy" className="h-full w-full object-cover" />
              )}
            </button>
          );
        })}
      </div>

      {open && (
        <Lightbox
          photo={open}
          url={urls.get(open.storage_path)}
          members={members}
          tags={tagsByPhoto.get(open.id) ?? []}
          currentUserId={user?.id ?? ""}
          isOwner={isOwner}
          onClose={() => setOpen(null)}
          onChange={() => {
            onChange();
          }}
        />
      )}
    </>
  );
}

function Lightbox({
  photo,
  url,
  members,
  tags,
  currentUserId,
  isOwner,
  onClose,
  onChange,
}: {
  photo: Photo;
  url?: string;
  members: Member[];
  tags: Tag[];
  currentUserId: string;
  isOwner: boolean;
  onClose: () => void;
  onChange: () => void;
}) {
  const [showTags, setShowTags] = useState(false);
  const tagged = new Set(tags.map((t) => t.tagged_user_id));
  const namesById = new Map(members.map((m) => [m.user_id, m.display_name]));

  async function toggleTag(userId: string) {
    if (tagged.has(userId)) {
      const tag = tags.find((t) => t.tagged_user_id === userId);
      if (!tag) return;
      const { error } = await supabase.from("photo_tags").delete().eq("id", tag.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("photo_tags").insert({
        photo_id: photo.id,
        tagged_user_id: userId,
        tagger_id: currentUserId,
      });
      if (error) return toast.error(error.message);
    }
    onChange();
  }

  async function deletePhoto() {
    if (!confirm("Delete this photo?")) return;
    const { error: sErr } = await supabase.storage.from("event-photos").remove([photo.storage_path]);
    if (sErr) console.warn(sErr);
    const { error } = await supabase.from("photos").delete().eq("id", photo.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    onClose();
    onChange();
  }

  const canDelete = isOwner || photo.uploader_id === currentUserId;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <button onClick={onClose} className="rounded-full p-2"><X className="h-5 w-5" /></button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTags((s) => !s)}
            className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-sm"
          >
            <TagIcon className="h-4 w-4" /> Tag people
          </button>
          {canDelete && (
            <button onClick={deletePhoto} className="rounded-full bg-white/10 p-2">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {url && <img src={url} alt="" className="h-full w-full object-contain" />}
      </div>
      {tags.length > 0 && !showTags && (
        <div className="bg-black/60 px-4 py-2 text-xs text-white/90">
          Tagged: {tags.map((t) => namesById.get(t.tagged_user_id) ?? "?").join(", ")}
        </div>
      )}
      {showTags && (
        <div className="max-h-72 overflow-auto border-t border-white/10 bg-card p-4">
          <p className="mb-2 text-sm font-medium">Who's in this photo?</p>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => {
              const on = tagged.has(m.user_id);
              return (
                <button
                  key={m.user_id}
                  onClick={() => toggleTag(m.user_id)}
                  className={
                    on
                      ? "rounded-full bg-primary px-3 py-1.5 text-sm text-primary-foreground"
                      : "rounded-full border border-border bg-background px-3 py-1.5 text-sm"
                  }
                >
                  {m.display_name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
