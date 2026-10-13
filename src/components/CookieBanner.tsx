import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

import {
  analyticsEnabled,
  CONSENT_CHANGED_EVENT,
  getConsent,
  setConsent,
  startAnalytics,
} from "@/lib/analytics";

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Sans clé PostHog, il n'y a aucun traceur : pas besoin de demander.
    if (!analyticsEnabled) return;
    const sync = () => setShow(getConsent() === null);
    sync();
    startAnalytics();
    window.addEventListener(CONSENT_CHANGED_EVENT, sync);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, sync);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-x-2 bottom-2 z-50 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:max-w-sm">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-lg">
        <p className="text-sm text-foreground">
          Nous aimerions mesurer l'audience de Memories (pages visitées et boutons cliqués, de façon
          anonyme) avec PostHog, hébergé dans l'Union européenne. Aucune photo, aucun enregistrement
          de votre écran. Vous pouvez refuser sans que cela change quoi que ce soit à l'application.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          En savoir plus dans notre{" "}
          <Link to="/privacy" className="underline">
            politique de confidentialité
          </Link>
          .
        </p>
        {/* Les deux boutons ont volontairement le même style (recommandation CNIL). */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setConsent("refused")}
            className="flex-1 rounded-full border border-border bg-background px-3 py-2 text-sm font-medium"
          >
            Refuser
          </button>
          <button
            onClick={() => setConsent("accepted")}
            className="flex-1 rounded-full border border-border bg-background px-3 py-2 text-sm font-medium"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}
