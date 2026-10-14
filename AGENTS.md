# Notes pour les assistants de code

Memory Lane (« Memories ») : app perso et non commerciale de partage de photos d'événements.
La propriétaire n'a pas de profil technique : expliquer simplement et documenter chaque changement.

## Stack

- TanStack Start (React 19, TypeScript, Vite 8, Tailwind 4, shadcn/ui), gestionnaire de paquets **bun**.
- Supabase (auth, Postgres avec RLS, bucket privé `event-photos`), projet en région Paris.
- Hébergement Vercel (plan Hobby), build serveur Nitro avec le preset `vercel`, fonctions à `cdg1`.
- Mesure d'audience PostHog UE, chargée uniquement après consentement (`src/lib/analytics.ts`).

## Règles

- Ne jamais réécrire l'historique git déjà poussé (force push, rebase, amend) : `main` est la
  branche de production Vercel. Le projet n'est plus relié à Lovable (déconnecté en octobre 2026).
- Ne jamais exposer `SUPABASE_SERVICE_ROLE_KEY` ni `CRON_SECRET` au navigateur
  (pas de préfixe `VITE_`, client admin importé seulement dans du code serveur).
- Toute modification du schéma passe par un nouveau fichier dans `supabase/migrations/`,
  avec RLS activé sur les nouvelles tables.
- Titre des pull requests : en français, une phrase claire qui dit ce que ça change pour
  l'utilisatrice (ex. « Retirer le GPS des photos envoyées »), jamais un nom technique ou un
  nom de branche. Le corps de la PR commence par un court « Pourquoi » et « Ce qui change ».
- Avant de pousser : `bun install`, `bun run build`, `bunx tsc --noEmit`, `bunx eslint <fichiers modifiés>`.

## Documentation

- `docs/DEPLOIEMENT.md` : guide pas à pas (comptes, variables d'environnement, mise en ligne).
