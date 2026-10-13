import imageCompression from "browser-image-compression";

/**
 * Prépare une photo avant envoi : réduction de taille ET suppression des
 * métadonnées (GPS, modèle de téléphone…). La position de l'événement sur la
 * carte vient de la base de données, jamais du fichier envoyé.
 */
export async function preparePhotoForUpload(file: File): Promise<{ blob: Blob; ext: string }> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 1.5,
    maxWidthOrHeight: 2000,
    useWebWorker: true,
  });

  // browser-image-compression ré-encode les grosses photos (les métadonnées
  // disparaissent) mais renvoie le fichier d'origine tel quel quand il est
  // déjà petit : dans ce cas on le ré-encode nous-mêmes.
  if (compressed === file) {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
    bitmap.close();
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Photo illisible"))),
        "image/jpeg",
        0.9,
      ),
    );
    return { blob, ext: "jpg" };
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  return { blob: compressed, ext };
}
