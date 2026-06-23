import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

const KEY = "memories.cookie-consent.v1";

export function CookieBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(KEY)) setShow(true);
  }, []);

  if (!show) return null;
  const decide = (choice: "accept" | "essential") => {
    localStorage.setItem(KEY, JSON.stringify({ choice, at: new Date().toISOString() }));
    setShow(false);
  };

  return (
    <div className="fixed inset-x-2 bottom-2 z-50 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:max-w-sm">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-lg">
        <p className="text-sm text-foreground">
          Memories n'utilise que des cookies essentiels pour vous maintenir connecté. Pas de suivi,
          pas d'analyses tierces.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Lisez notre{" "}
          <Link to="/privacy" className="underline">
            politique de confidentialité
          </Link>
          .
        </p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => decide("essential")}
            className="flex-1 rounded-full border border-border bg-background px-3 py-2 text-sm font-medium"
          >
            Essentiels uniquement
          </button>
          <button
            onClick={() => decide("accept")}
            className="flex-1 rounded-full bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            J'ai compris
          </button>
        </div>
      </div>
    </div>
  );
}
