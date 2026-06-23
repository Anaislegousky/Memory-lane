import { supabase } from "@/integrations/supabase/client";

export async function signedUrlsFor(paths: string[]) {
  if (!paths.length) return new Map<string, string>();
  const { data, error } = await supabase.storage
    .from("event-photos")
    .createSignedUrls(paths, 60 * 60); // 1h
  if (error) throw error;
  const map = new Map<string, string>();
  data?.forEach((d) => {
    if (d.signedUrl && d.path) map.set(d.path, d.signedUrl);
  });
  return map;
}
