import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { analyticsEnabled, CONSENT_CHANGED_EVENT, getConsent, resetConsent } from "@/lib/analytics";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — Memories" },
      {
        name: "description",
        content: "Comment Memories traite vos données personnelles et vos droits au titre du RGPD.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link to="/" className="text-sm text-muted-foreground">
        ← Retour
      </Link>
      <h1 className="mt-4 font-display text-4xl">Politique de confidentialité</h1>
      <p className="mt-2 text-sm text-muted-foreground">Dernière mise à jour : octobre 2026</p>

      <section className="prose prose-sm mt-8 max-w-none space-y-6 text-foreground">
        <div>
          <h2 className="font-display text-xl">Ce que nous stockons et pourquoi</h2>
          <p className="mt-2 text-sm">
            Memories ne stocke que le minimum nécessaire au fonctionnement de l'application : votre
            e-mail et un nom d'affichage (pour que vos amis vous reconnaissent), les événements que
            vous créez (nom, date, lieu), les photos que vous chargez et les identifications que
            vous ajoutez sur ces photos. Nous ne vendons et ne partageons jamais ces données avec
            des tiers.
          </p>
        </div>
        <div>
          <h2 className="font-display text-xl">Où elles sont stockées</h2>
          <p className="mt-2 text-sm">
            Les données et les photos sont stockées chez Supabase, dans un centre de données situé à
            Paris (France). Les photos sont conservées dans un espace de stockage privé et sont
            automatiquement supprimées 90 jours après leur dépôt.
          </p>
          <p className="mt-2 text-sm">
            L'application elle-même est hébergée par Vercel (société américaine), avec des serveurs
            situés à Paris. Les pages publiques (sans vos données) peuvent être servies depuis le
            réseau mondial de Vercel pour s'afficher plus vite.
          </p>
        </div>
        <div>
          <h2 className="font-display text-xl">Photos et localisation</h2>
          <p className="mt-2 text-sm">
            Lorsque vous ajoutez des photos, la date et le lieu de prise de vue enregistrés dans le
            fichier peuvent être lus directement dans votre navigateur pour vous proposer la date et
            le lieu de l'événement. Les photos sont ensuite redimensionnées avant envoi.
          </p>
        </div>
        <div>
          <h2 className="font-display text-xl">Cookies et mesure d'audience</h2>
          <p className="mt-2 text-sm">
            Nous utilisons le stockage local de votre navigateur pour vous maintenir connecté et
            mémoriser votre choix concernant la mesure d'audience. Ces éléments sont indispensables
            et ne nécessitent pas votre accord.
          </p>
          <p className="mt-2 text-sm">
            Uniquement si vous l'acceptez, nous mesurons l'audience avec PostHog, hébergé dans
            l'Union européenne (Francfort, Allemagne) : pages visitées (sans les liens
            d'invitation), type d'appareil et de navigateur, pays approximatif. Pas d'enregistrement
            de votre écran, pas de publicité, pas de revente. Si vous refusez, rien n'est chargé.
          </p>
          <ConsentControl />
        </div>
        <div>
          <h2 className="font-display text-xl">Vos droits</h2>
          <p className="mt-2 text-sm">
            Au titre du RGPD, vous pouvez à tout moment accéder, exporter, corriger ou supprimer vos
            données. Vous pouvez :
          </p>
          <ul className="ml-5 mt-2 list-disc text-sm">
            <li>Exporter vos données depuis votre page Profil (téléchargement JSON).</li>
            <li>
              Supprimer votre compte ainsi que tous vos événements, photos et tags depuis votre page
              Profil.
            </li>
            <li>
              Nous contacter pour toute autre demande à{" "}
              <a className="underline" href="mailto:privacy@memories.app">
                privacy@memories.app
              </a>
              .
            </li>
          </ul>
        </div>
        <div>
          <h2 className="font-display text-xl">Accès aux photos</h2>
          <p className="mt-2 text-sm">
            Les photos sont privées et réservées aux membres de l'événement. Elles sont servies via
            des URLs signées à durée limitée et ne sont jamais accessibles publiquement.
          </p>
        </div>
        <div>
          <h2 className="font-display text-xl">Contact</h2>
          <p className="mt-2 text-sm">
            Pour toute demande RGPD ou question, écrivez à{" "}
            <a className="underline" href="mailto:privacy@memories.app">
              privacy@memories.app
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
}

function ConsentControl() {
  const [consent, setConsentState] = useState<string | null>(null);
  useEffect(() => {
    const sync = () => setConsentState(getConsent());
    sync();
    window.addEventListener(CONSENT_CHANGED_EVENT, sync);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, sync);
  }, []);

  if (!analyticsEnabled) {
    return (
      <p className="mt-2 text-sm text-muted-foreground">
        La mesure d'audience est actuellement désactivée.
      </p>
    );
  }

  const label =
    consent === "accepted" ? "acceptée" : consent === "refused" ? "refusée" : "pas encore choisie";
  return (
    <p className="mt-2 text-sm">
      Votre choix actuel : <strong>{label}</strong>.{" "}
      <button type="button" className="underline" onClick={resetConsent}>
        Modifier mon choix
      </button>
    </p>
  );
}
