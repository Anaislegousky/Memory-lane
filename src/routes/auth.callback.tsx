import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Confirmation — Memories" }] }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [message, setMessage] = useState("Confirmation en cours…");

  useEffect(() => {
    (async () => {
      try {
        const href = window.location.href;
        const url = new URL(href);

        // Error returned by Supabase (expired / invalid)
        const errDesc =
          url.searchParams.get("error_description") ||
          new URLSearchParams(url.hash.slice(1)).get("error_description");
        if (errDesc) {
          setStatus("error");
          setMessage(decodeURIComponent(errDesc));
          return;
        }

        // PKCE flow: ?code=...
        if (url.searchParams.get("code")) {
          const { error } = await supabase.auth.exchangeCodeForSession(href);
          if (error) throw error;
        } else if (url.hash.includes("access_token")) {
          // Implicit flow fallback
          const params = new URLSearchParams(url.hash.slice(1));
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");
          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) throw error;
          }
        }

        // Confirm session is live
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          // Some templates only confirm the email without signing in.
          setStatus("error");
          setMessage(
            "Votre e-mail est confirmé. Connectez-vous pour continuer.",
          );
          setTimeout(() => navigate({ to: "/auth", search: { mode: "signin" } }), 1500);
          return;
        }
        navigate({ to: "/events", replace: true });
      } catch (err: any) {
        setStatus("error");
        setMessage(err?.message || "Lien invalide ou expiré.");
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="font-display text-3xl">
          {status === "loading" ? "Un instant…" : "Oups"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">{message}</p>
        {status === "error" && (
          <Link
            to="/auth"
            className="mt-6 inline-block rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
          >
            Retour à la connexion
          </Link>
        )}
      </div>
    </div>
  );
}
