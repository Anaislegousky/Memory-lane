import { useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";
import { ImagePlus, Camera, Loader2 } from "lucide-react";

export function PhotoUploader({ eventId, onUploaded }: { eventId: string; onUploaded: () => void }) {
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
        className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        {busy ? "Envoi…" : "Ajouter des photos"}
      </button>
      <button
        onClick={() => cameraRef.current?.click()}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm font-medium disabled:opacity-60"
      >
        <Camera className="h-4 w-4" />
        Prendre une photo
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
