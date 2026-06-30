import { useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useIsGuest, GuestUpgradeDialog } from "@/components/GuestGate";
import { toast } from "sonner";
import { Plus, Camera, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const hiddenInputStyle = "absolute h-px w-px overflow-hidden border-0 p-0 opacity-0 pointer-events-none";

const GUEST_PHOTO_LIMIT = 10;

export function PhotoUploader({
  eventId,
  onUploaded,
  variant = "compact",
}: {
  eventId: string;
  onUploaded: () => void;
  variant?: "compact" | "full";
}) {
  const { user } = useAuth();
  const isGuest = useIsGuest();
  const queryClient = useQueryClient();
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);

  // Returns true if upload may proceed; false if guest limit hit.
  async function checkGuestLimit(incoming: number): Promise<boolean> {
    if (!isGuest || !user) return true;
    const { count } = await supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("uploader_id", user.id);
    const current = count ?? 0;
    if (current + incoming > GUEST_PHOTO_LIMIT) {
      setLimitOpen(true);
      return false;
    }
    return true;
  }

  async function pick(ref: React.RefObject<HTMLInputElement | null>) {
    ref.current?.click();
  }

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!user || !e.target.files?.length) return;
    const files = Array.from(e.target.files);
    if (!(await checkGuestLimit(files.length))) {
      if (galleryRef.current) galleryRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
      return;
    }
    setBusy(true);
    let ok = 0;
    for (const file of files) {
      try {
        const compressed = await imageCompression(file, {
          maxSizeMB: 1.5,
          maxWidthOrHeight: 2000,
          useWebWorker: true,
        });
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const id = crypto.randomUUID();
        const path = `${eventId}/${id}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("event-photos")
          .upload(path, compressed, { contentType: compressed.type || file.type, upsert: false });
        if (upErr) throw upErr;
        const { error: dbErr } = await supabase.from("photos").insert({
          id,
          event_id: eventId,
          uploader_id: user.id,
          storage_path: path,
        });
        if (dbErr) throw dbErr;
        ok++;
      } catch (err: any) {
        console.error(err);
        toast.error(err?.message || "Échec de l'envoi");
      }
    }
    setBusy(false);
    if (galleryRef.current) galleryRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
    if (ok > 0) {
      toast.success(`${ok} photo${ok > 1 ? "s" : ""} ajoutée${ok > 1 ? "s" : ""}`);
      queryClient.invalidateQueries({ queryKey: ["events-map"] });
      onUploaded();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => pick(galleryRef)}
        disabled={busy}
        aria-label="Ajouter des photos"
        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition active:scale-[0.98] disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        {busy ? "Envoi…" : "Ajouter"}
      </button>
      <button
        type="button"
        onClick={() => pick(cameraRef)}
        disabled={busy}
        aria-label="Prendre une photo"
        title="Prendre une photo"
        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-accent-foreground transition active:scale-[0.98] disabled:opacity-60"
      >
        <Camera className="h-5 w-5" />
      </button>
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        onChange={onChange}
        className={hiddenInputStyle}
        tabIndex={-1}
        aria-hidden="true"
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onChange}
        className={hiddenInputStyle}
        tabIndex={-1}
        aria-hidden="true"
      />
      <GuestUpgradeDialog action="upload_limit" open={limitOpen} onOpenChange={setLimitOpen} />
    </>
  );
}
