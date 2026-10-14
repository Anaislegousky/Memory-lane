import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

const feedbackInput = z.object({
  kind: z.enum(["bug", "idea", "other"]),
  message: z.string().trim().min(5).max(2000),
  contact_email: z
    .string()
    .trim()
    .max(254)
    .email()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  page: z.string().max(300).optional(),
});

const MAX_PER_HOUR_PER_USER = 5;
// Visiteurs sans session (page d'accueil, connexion…) : plafond commun à tous.
const MAX_PER_HOUR_ANONYMOUS = 20;

// Garde seulement le chemin de la page, sans jeton d'invitation ni identifiant d'événement.
function cleanPage(page: string | undefined) {
  if (!page) return null;
  const path = page.split(/[?#]/)[0];
  return path
    .replace(/^\/join\/[^/]+/, "/join/:token")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id")
    .slice(0, 100);
}

// L'envoi est ouvert à tous, même sans session : on relie le message au compte seulement
// si un jeton valide est présent.
export const sendFeedback = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => feedbackInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const request = getRequest();
    const token = request?.headers.get("authorization")?.replace(/^Bearer /, "");
    let userId: string | null = null;
    if (token) {
      const { data: auth } = await supabaseAdmin.auth.getUser(token);
      userId = auth.user?.id ?? null;
    }

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    let recent = supabaseAdmin
      .from("feedback")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since);
    recent = userId ? recent.eq("user_id", userId) : recent.is("user_id", null);
    const { count } = await recent;
    if ((count ?? 0) >= (userId ? MAX_PER_HOUR_PER_USER : MAX_PER_HOUR_ANONYMOUS)) {
      throw new Error("Trop de messages envoyés, réessayez un peu plus tard.");
    }

    const { error } = await supabaseAdmin.from("feedback").insert({
      user_id: userId,
      kind: data.kind,
      message: data.message,
      contact_email: data.contact_email ?? null,
      page: cleanPage(data.page),
      user_agent: request?.headers.get("user-agent")?.slice(0, 300) ?? null,
    });
    if (error) throw new Error("Impossible d'enregistrer votre message pour le moment.");

    return { ok: true };
  });
