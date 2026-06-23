import { useEffect, useMemo, useState, useCallback } from "react";
import { signedUrlsFor } from "@/lib/photo-urls";
import { Tag as TagIcon, X, Trash2, Download, Check, ChevronLeft, ChevronRight, CheckSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";
import JSZip from "jszip";

export type Photo = {
  id: string;
  storage_path: string;
  uploader_id: string;
  created_at: string;
};

export type Member = { user_id: string; display_name: string };
export type Tag = { id: string; photo_id: string; tagged_user_id: string };

async function downloadOne(url: string, filename: string) {
  const res = await fetch(url);
  const blob = await res.blob();
  const a = document.createElement("a");
  const objUrl = URL.createObjectURL(blob);
  a.href = objUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objUrl);
}

async function downloadMany(items: { url: string; name: string }[]) {
  if (items.length === 1) {
    await downloadOne(items[0].url, items[0].name);
    return;
  }
  const zip = new JSZip();
  await Promise.all(
    items.map(async (it) => {
      const res = await fetch(it.url);
      const blob = await res.blob();
      zip.file(it.name, blob);
    }),
  );
  const blob = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  const objUrl = URL.createObjectURL(blob);
  a.href = objUrl;
  a.download = `photos-${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objUrl);
}

function filenameFor(p: Photo) {
  const ext = p.storage_path.split(".").pop()?.split("?")[0] ?? "jpg";
  return `${p.id}.${ext}`;
}

export function PhotoGallery({
  photos,
  members,
  tags,
  onChange,
  isOwner,
  count,
}: {
  photos: Photo[];
  members: Member[];
  tags: Tag[];
  onChange: () => void;
  isOwner: boolean;
  count?: number;
}) {
  const { user } = useAuth();
  const [urls, setUrls] = useState<Map<string, string>>(new Map());
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

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

  const toggleSelect = useCallback((id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  function exitSelect() {
    setSelectMode(false);
    setSelected(new Set());
  }

  async function downloadSelected() {
    const items = photos
      .filter((p) => selected.has(p.id))
      .map((p) => ({ url: urls.get(p.storage_path) ?? "", name: filenameFor(p) }))
      .filter((i) => i.url);
    if (!items.length) return;
    setBusy(true);
    try {
      await downloadMany(items);
      toast.success(`${items.length} photo${items.length > 1 ? "s" : ""} téléchargée${items.length > 1 ? "s" : ""}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Téléchargement impossible");
    } finally {
      setBusy(false);
    }
  }

  async function downloadAll() {
    const items = photos
      .map((p) => ({ url: urls.get(p.storage_path) ?? "", name: filenameFor(p) }))
      .filter((i) => i.url);
    if (!items.length) return;
    setBusy(true);
    try {
      await downloadMany(items);
      toast.success("Téléchargement prêt");
    } catch (e: any) {
      toast.error(e?.message ?? "Téléchargement impossible");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSelected() {
    const toDelete = photos.filter((p) => selected.has(p.id) && (isOwner || p.uploader_id === user?.id));
    if (!toDelete.length) return;
    if (!confirm(`Supprimer ${toDelete.length} photo(s) ?`)) return;
    const paths = toDelete.map((p) => p.storage_path);
    await supabase.storage.from("event-photos").remove(paths);
    const { error } = await supabase.from("photos").delete().in("id", toDelete.map((p) => p.id));
    if (error) return toast.error(error.message);
    toast.success("Supprimées");
    exitSelect();
    onChange();
  }

  if (!photos.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 py-10 text-center text-sm text-muted-foreground">
        Aucune photo pour le moment. Soyez le premier à en ajouter.
      </div>
    );
  }

  return (
    <>
      <div className="mb-2 flex items-center gap-2">
        {!selectMode ? (
          <>
            <button
              onClick={() => setSelectMode(true)}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs"
            >
              <CheckSquare className="h-3.5 w-3.5" /> Sélectionner
            </button>
            <button
              onClick={downloadAll}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" /> Tout télécharger
            </button>
            <span className="ml-auto text-xs text-muted-foreground">{photos.length} photo{photos.length > 1 ? "s" : ""}</span>
          </>
        ) : (
          <>
            <button onClick={exitSelect} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs">
              Annuler
            </button>
            <button
              onClick={() => setSelected(new Set(photos.map((p) => p.id)))}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs"
            >
              Tout
            </button>
            <span className="text-xs text-muted-foreground">{selected.size} sélectionnée{selected.size > 1 ? "s" : ""}</span>
            <div className="ml-auto flex gap-1.5">
              <button
                onClick={downloadSelected}
                disabled={busy || !selected.size}
                className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" /> Télécharger
              </button>
              <button
                onClick={deleteSelected}
                disabled={!selected.size}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1.5 text-xs text-destructive disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-3">
        {photos.map((p, i) => {
          const u = urls.get(p.storage_path);
          const isSel = selected.has(p.id);
          return (
            <button
              key={p.id}
              onClick={() => (selectMode ? toggleSelect(p.id) : setOpenIdx(i))}
              aria-label={selectMode ? "Sélectionner" : "Voir la photo"}
              className="relative aspect-square overflow-hidden rounded-lg bg-muted"
            >
              {u && (
                <img src={u} alt="" loading="lazy" className="h-full w-full object-cover" />
              )}
              {selectMode && (
                <span
                  className={
                    "absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 " +
                    (isSel ? "border-primary bg-primary text-primary-foreground" : "border-white/80 bg-black/30")
                  }
                >
                  {isSel && <Check className="h-3.5 w-3.5" />}
                </span>
              )}
              {selectMode && isSel && <span className="absolute inset-0 bg-primary/20" />}
            </button>
          );
        })}
      </div>

      {openIdx !== null && photos[openIdx] && (
        <Lightbox
          photos={photos}
          index={openIdx}
          urls={urls}
          members={members}
          tagsByPhoto={tagsByPhoto}
          currentUserId={user?.id ?? ""}
          isOwner={isOwner}
          onIndex={setOpenIdx}
          onClose={() => setOpenIdx(null)}
          onChange={onChange}
        />
      )}
    </>
  );
}

function Lightbox({
  photos,
  index,
  urls,
  members,
  tagsByPhoto,
  currentUserId,
  isOwner,
  onIndex,
  onClose,
  onChange,
}: {
  photos: Photo[];
  index: number;
  urls: Map<string, string>;
  members: Member[];
  tagsByPhoto: Map<string, Tag[]>;
  currentUserId: string;
  isOwner: boolean;
  onIndex: (i: number) => void;
  onClose: () => void;
  onChange: () => void;
}) {
  const photo = photos[index];
  const url = urls.get(photo.storage_path);
  const tags = tagsByPhoto.get(photo.id) ?? [];
  const [showTags, setShowTags] = useState(false);
  const tagged = new Set(tags.map((t) => t.tagged_user_id));
  const namesById = new Map(members.map((m) => [m.user_id, m.display_name]));

  const prev = useCallback(() => onIndex((index - 1 + photos.length) % photos.length), [index, photos.length, onIndex]);
  const next = useCallback(() => onIndex((index + 1) % photos.length), [index, photos.length, onIndex]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, onClose]);

  // touch swipe
  const [touchX, setTouchX] = useState<number | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    setTouchX(e.touches[0].clientX);
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX == null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) {
      if (dx > 0) prev();
      else next();
    }
    setTouchX(null);
  }

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
    if (!confirm("Supprimer cette photo ?")) return;
    await supabase.storage.from("event-photos").remove([photo.storage_path]);
    const { error } = await supabase.from("photos").delete().eq("id", photo.id);
    if (error) return toast.error(error.message);
    toast.success("Supprimée");
    onClose();
    onChange();
  }

  async function download() {
    if (!url) return;
    try {
      await downloadOne(url, filenameFor(photo));
    } catch (e: any) {
      toast.error(e?.message ?? "Téléchargement impossible");
    }
  }

  const canDelete = isOwner || photo.uploader_id === currentUserId;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <button onClick={onClose} aria-label="Fermer" className="rounded-full p-2"><X className="h-5 w-5" /></button>
        <span className="text-xs text-white/70">{index + 1} / {photos.length}</span>
        <div className="flex items-center gap-2">
          <button onClick={download} aria-label="Télécharger" className="rounded-full bg-white/10 p-2">
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowTags((s) => !s)}
            className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-sm"
          >
            <TagIcon className="h-4 w-4" /> Identifier
          </button>
          {canDelete && (
            <button onClick={deletePhoto} aria-label="Supprimer la photo" className="rounded-full bg-white/10 p-2">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <div
        className="relative flex-1 overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {url && <img src={url} alt="" className="h-full w-full object-contain" />}
        {photos.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Précédente"
              className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white sm:block"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={next}
              aria-label="Suivante"
              className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white sm:block"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>
      {tags.length > 0 && !showTags && (
        <div className="bg-black/60 px-4 py-2 text-xs text-white/90">
          Identifié·es : {tags.map((t) => namesById.get(t.tagged_user_id) ?? "?").join(", ")}
        </div>
      )}
      {showTags && (
        <div className="max-h-72 overflow-auto border-t border-white/10 bg-card p-4">
          <p className="mb-2 text-sm font-medium">Qui est sur cette photo ?</p>
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
