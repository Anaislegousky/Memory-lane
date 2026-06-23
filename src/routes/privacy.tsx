import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — Memories" },
      { name: "description", content: "Comment Memories traite vos données personnelles et vos droits au titre du RGPD." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link to="/" className="text-sm text-muted-foreground">← Retour</Link>
      <h1 className="mt-4 font-display text-4xl">Politique de confidentialité</h1>
      <p className="mt-2 text-sm text-muted-foreground">Dernière mise à jour : juin 2026</p>

      <section className="prose prose-sm mt-8 max-w-none space-y-6 text-foreground">
        <div>
          <h2 className="font-display text-xl">Ce que nous stockons et pourquoi</h2>
          <p className="mt-2 text-sm">
            Memories ne stocke que le minimum nécessaire au fonctionnement de l'application : votre
            e-mail et un nom d'affichage (pour que vos amis vous reconnaissent), les événements que
            vous créez (nom, date, lieu), les photos que vous chargez et les identifications que vous
            ajoutez sur ces photos. Nous ne vendons et ne partageons jamais ces données avec des tiers.
          </p>
        </div>
        <div>
          <h2 className="font-display text-xl">Où elles sont stockées</h2>
          <p className="mt-2 text-sm">
            Les données et les photos sont hébergées sur notre infrastructure dans l'Union européenne.
            Les photos sont conservées dans un espace de stockage privé et sont automatiquement
            supprimées 90 jours après leur dépôt.
          </p>
        </div>
        <div>
          <h2 className="font-display text-xl">Cookies et traceurs</h2>
          <p className="mt-2 text-sm">
            Nous n'utilisons que des cookies/stockage local essentiels pour vous maintenir connecté
            et mémoriser votre choix de cookies. Aucun outil d'analyse ou de publicité tiers.
          </p>
        </div>
        <div>
          <h2 className="font-display text-xl">Vos droits</h2>
          <p className="mt-2 text-sm">
            Au titre du RGPD, vous pouvez à tout moment accéder, exporter, corriger ou supprimer vos
            données. Vous pouvez :
          </p>
          <ul className="ml-5 mt-2 list-disc text-sm">
            <li>Exporter vos données depuis votre page Profil (téléchargement JSON).</li>
            <li>Supprimer votre compte ainsi que tous vos événements, photos et tags depuis votre page Profil.</li>
            <li>
              Nous contacter pour toute autre demande à{" "}
              <a className="underline" href="mailto:privacy@memories.app">privacy@memories.app</a>.
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
            <a className="underline" href="mailto:privacy@memories.app">privacy@memories.app</a>.
          </p>
        </div>
      </section>
    </div>
  );
}
