import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
});

const KIND_LABEL = { bug: "Bug", idea: "Idée", other: "Autre" } as const;
const MAX_PER_HOUR = 5;

// Prévient la propriétaire par e-mail (service Brevo, hébergé en France).
// Facultatif : sans BREVO_API_KEY / FEEDBACK_NOTIFY_EMAIL, le retour est seulement enregistré.
// Une panne d'e-mail ne doit jamais faire échouer l'envoi du retour : il est déjà en base.
async function notifyByEmail(f: {
  kind: keyof typeof KIND_LABEL;
  message: string;
  contact_email?: string;
  user_agent: string | null;
}) {
  const apiKey = process.env.BREVO_API_KEY;
  const to = process.env.FEEDBACK_NOTIFY_EMAIL;
  if (!apiKey || !to) return;
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Memories", email: to },
        to: [{ email: to }],
        ...(f.contact_email ? { replyTo: { email: f.contact_email } } : {}),
        subject: `[Memories] ${KIND_LABEL[f.kind]} : nouveau retour`,
        textContent: [
          f.message,
          "",
          `Contact : ${f.contact_email ?? "non renseigné"}`,
          `Appareil : ${f.user_agent ?? "inconnu"}`,
          "",
          "Tous les retours : Supabase → Table Editor → feedback",
        ].join("\n"),
      }),
    });
    if (!res.ok)
      console.error("[feedback] Brevo a refusé l'e-mail :", res.status, await res.text());
  } catch (err) {
    console.error("[feedback] Envoi de l'e-mail impossible :", err);
  }
}

export const sendFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => feedbackInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Anti-abus simple : 5 retours par heure et par compte (les invités ont un compte anonyme).
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("feedback")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .gte("created_at", since);
    if ((count ?? 0) >= MAX_PER_HOUR) {
      throw new Error("Vous avez déjà envoyé plusieurs messages, réessayez un peu plus tard.");
    }

    const userAgent = getRequest()?.headers.get("user-agent")?.slice(0, 300) ?? null;
    const { error } = await supabaseAdmin.from("feedback").insert({
      user_id: context.userId,
      kind: data.kind,
      message: data.message,
      contact_email: data.contact_email ?? null,
      user_agent: userAgent,
    });
    if (error) throw new Error("Impossible d'enregistrer votre message pour le moment.");

    await notifyByEmail({ ...data, user_agent: userAgent });
    return { ok: true };
  });
