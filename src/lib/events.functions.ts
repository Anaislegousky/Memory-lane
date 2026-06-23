import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createEventInput = z.object({
  name: z.string().trim().min(2).max(80),
  event_date: z.string().optional().nullable(),
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