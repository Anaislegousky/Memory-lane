import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createEventInput = z.object({
  name: z.string().trim().min(2).max(80),
  event_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  location_label: z.string().trim().max(200).optional().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
});

export const createEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createEventInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: event, error } = await supabaseAdmin
      .from("events")
      .insert({
        owner_id: context.userId,
        name: data.name,
        event_date: data.event_date || null,
        end_date: data.end_date || null,
        location_label: data.location_label || null,
        lat: data.lat,
        lng: data.lng,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    const { error: memberError } = await supabaseAdmin
      .from("event_members")
      .upsert(
        { event_id: event.id, user_id: context.userId, role: "owner" },
        { onConflict: "event_id,user_id" },
      );

    if (memberError) {
      await supabaseAdmin.from("events").delete().eq("id", event.id);
      throw new Error(memberError.message);
    }

    return { id: event.id };
  });

const updateEventInput = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(80),
  event_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  location_label: z.string().trim().max(200).optional().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
});

export const updateEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateEventInput.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("events")
      .update({
        name: data.name,
        event_date: data.event_date || null,
        end_date: data.end_date || null,
        location_label: data.location_label || null,
        lat: data.lat,
        lng: data.lng,
      })
      .eq("id", data.id)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Geocoding proxied server-side to avoid browser CORS/User-Agent issues with Nominatim.
const UA = "Memories-App/1.0 (contact: support@memories.app)";

export const geocodeSearch = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ q: z.string().trim().min(2).max(120) }).parse(data),
  )
  .handler(async ({ data }) => {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=5&accept-language=fr&q=${encodeURIComponent(data.q)}`,
      { headers: { "User-Agent": UA, Accept: "application/json" } },
    );
    if (!r.ok) throw new Error("Recherche indisponible");
    const j = (await r.json()) as { display_name: string; lat: string; lon: string }[];
    return j.map((x) => ({
      display_name: x.display_name,
      lat: parseFloat(x.lat),
      lng: parseFloat(x.lon),
    }));
  });

export const geocodeReverse = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ lat: z.number(), lng: z.number() }).parse(data),
  )
  .handler(async ({ data }) => {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${data.lat}&lon=${data.lng}&zoom=14&accept-language=fr`,
      { headers: { "User-Agent": UA, Accept: "application/json" } },
    );
    if (!r.ok) throw new Error("Géocodage indisponible");
    const j = (await r.json()) as { display_name?: string };
    return { display_name: j.display_name ?? `${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}` };
  });
