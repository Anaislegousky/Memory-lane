import { useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";
import { Plus, Camera, Loader2 } from "lucide-react";

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
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!user || !e.target.files?.length) return;
    const files = Array.from(e.target.files);
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
      onUploaded();
    }
  }

  return (
    <>
      <button
        onClick={() => galleryRef.current?.click()}
        disabled={busy}
        aria-label="Ajouter des photos"
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-base font-semibold text-primary-foreground shadow-sm transition active:scale-[0.98] disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
        {busy ? "Envoi…" : "Ajouter"}
      </button>
      <button
        onClick={() => cameraRef.current?.click()}
        disabled={busy}
        aria-label="Prendre une photo"
        title="Prendre une photo"
        className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground transition active:scale-[0.98] disabled:opacity-60"
      >
        <Camera className="h-5 w-5" />
      </button>
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        onChange={onChange}
        className="hidden"
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onChange}
        className="hidden"
      />
    </>
  );
}
