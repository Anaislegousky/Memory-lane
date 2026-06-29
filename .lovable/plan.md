# Plan

## 1. Autocomplétion lieu dans l'import photo (CreateMenu)

Aligner le champ "Lieu" du panneau d'import sur la page « Nouvel événement » :
- Champ pleine largeur, ≥44px (mobile-friendly), même style.
- Saisie → recherche via la server fn existante `geocodeSearch` (Nominatim, déjà utilisée par `/events/new`), avec petit debounce (300 ms).
- Liste déroulante de suggestions sous le champ ; clic = remplit `location_label`, `lat`, `lng`.
- Bouton « Ma position » (réutilise `geocodeReverse`) à côté, utile quand les photos n'ont pas d'EXIF GPS.
- Préremplissage : si l'EXIF a donné un label, il s'affiche déjà et reste éditable.

## 2. Champs date + lieu identiques à « Nouvel événement »

Remplacer les petits chips ronds (date, →date, lieu) dans la preview d'import par les mêmes blocs que `_authenticated.events.new.tsx` :
- Carte « Date » avec input `type=date` pleine largeur, checkbox « Plusieurs jours », date de fin conditionnelle (min = date début).
- Carte « Lieu » identique à la page Nouvel événement (bouton « Ma position », champ recherche + bouton, liste de résultats, pastille du lieu sélectionné, fallback libellé libre).
- Mêmes classes Tailwind (`rounded-2xl border border-border bg-card p-4`, inputs `px-4 py-3 rounded-xl`) pour cohérence visuelle.

## 3. Parcours d'invitation = parcours landing

`src/routes/join.$token.tsx` :
- Quand l'utilisateur n'est pas connecté, afficher exactement le contenu de `Landing` (titre, sous-titre, CTA « Commencer » mode invité, CTA « J'ai déjà un compte »), mais avec un bandeau contextuel : « Vous avez été invité à <nom de l'événement> » (récupéré via une nouvelle server fn publique `getInvitePreview(token)` qui renvoie juste le `event_name` / `inviter_name` sans rien révéler de sensible).
- Les deux CTA passent `redirect=/join/${token}` dans les search params pour que la redemption se fasse à la fin du flow auth/invité.
- Préserver le token dans `sessionStorage` également, en cas d'aller-retour OAuth/email.

`src/routes/auth.tsx` (mode guest) :
- Après création du compte anonyme, demander le prénom (input simple, validation min 1 caractère) avant de continuer.
- Sauvegarder dans `user_metadata.display_name` (le trigger `handle_new_user` le propage déjà dans `profiles`).
- Puis exécuter le `redirect` (qui peut être `/join/<token>` → redemption auto → `/events/<id>`).

## 4. Upgrade compte invité → email/mot de passe

Dans `/profile` :
- Si `user.is_anonymous === true`, afficher une carte « Sauvegarder mon compte » avec champs email + mot de passe.
- Appel : `supabase.auth.updateUser({ email, password })` → Supabase envoie un mail de confirmation et lie l'identité email à l'utilisateur anonyme existant (les données sont conservées).
- Message d'info clair : « Vos souvenirs restent accessibles depuis n'importe quel appareil après confirmation. »

## 5. Détails techniques

- Pas de migration DB nécessaire (anonymous auth déjà actif, `is_anonymous` natif Supabase, `handle_new_user` déjà OK).
- Nouvelle server fn `getInvitePreview` publique (pas de `requireSupabaseAuth`) dans `src/lib/invites.functions.ts`, lit `invites` + `events` + `profiles` via `supabaseAdmin` (chargé inside handler) et renvoie un objet minimal `{ scope, event_name, inviter_name }`. Validation : token non expiré, non révoqué.
- Réutilisation des server fn `geocodeSearch` / `geocodeReverse` existantes dans `CreateMenu` (via `useServerFn`).

## Fichiers modifiés
- `src/components/CreateMenu.tsx` — preview = mêmes blocs date/lieu que `/events/new`, autocomplétion lieu.
- `src/routes/join.$token.tsx` — clone du Landing + bandeau contextuel + propagation token via redirect.
- `src/routes/auth.tsx` — étape prénom pour le mode guest, prise en compte de `redirect`.
- `src/routes/_authenticated.profile.tsx` — carte « Sauvegarder mon compte » si anonyme.
- `src/lib/invites.functions.ts` — ajout `getInvitePreview`.
