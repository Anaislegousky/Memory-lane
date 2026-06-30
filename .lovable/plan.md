## Objectif

Garder la landing **classique (email + mot de passe + Google)** sans mode invité global. Le **mode invité reste uniquement via un lien d'invitation à un événement**, avec restrictions strictes + **code secret type Zoom** ajouté au lien.

---

## 1. Landing & Auth classique

- Retirer le bouton "Commencer" (guest) sur `src/routes/index.tsx`. CTA principal = "Créer un compte" + "J'ai déjà un compte".
- `src/routes/auth.tsx` : conserver email/mot de passe + Google sign-in. Retirer le mode `guest` du sélecteur de mode (sauf quand on arrive via `/join/$token`).

## 2. Lien d'invitation à un événement

### Code secret (style Zoom)
- Ajouter colonne `secret_code TEXT` sur `invites` (6 caractères alphanumériques, généré côté serveur à la création).
- Le lien généré devient `/join/{token}?code={secret_code}` (le code est dans l'URL, comme Zoom — l'utilisateur n'a rien à taper si le lien est complet).
- Si le code est manquant ou faux → page "Lien invalide / code incorrect" avec champ pour saisir le code manuellement (fallback).
- Vérification côté serveur dans `getInvitePreview` et `redeemInvite` (`src/lib/invites.functions.ts`).

### Parcours invité
- `/join/$token` propose : "J'ai un compte / Je crée un compte / **Continuer en tant qu'invité**" (uniquement ici).
- Mode invité = anonymous auth Supabase + saisie obligatoire d'un **prénom/pseudo** (stocké dans `profiles.display_name`).
- Lien d'invitation expire après **14 jours**, accès invité expire après **7 jours d'inactivité**.

## 3. Restrictions invité (`is_anonymous` = true)

| Action | Invité | Compte |
|---|---|---|
| Voir photos de l'événement où invité | ✅ | ✅ |
| Uploader photos | ✅ (max **10**) | ✅ |
| Télécharger photos (perso ou autres) | ❌ popup | ✅ |
| Supprimer photo d'un autre | ❌ popup | ✅ (si owner event) |
| Supprimer ses propres photos | ✅ | ✅ |
| Créer un événement | ❌ popup | ✅ |
| Inviter d'autres personnes | ❌ popup | ✅ |
| Accéder à `/events` (liste) ou `/map` | ❌ redirigé vers son événement | ✅ |

### Implémentation des restrictions
- Helper `useIsGuest()` qui lit `user.is_anonymous` depuis `AuthProvider`.
- Composant `<GuestGate action="...">` qui wrap les boutons : au clic affiche un `AlertDialog` "Cette action nécessite un compte" + CTA "Créer mon compte" (redirige vers `/auth?mode=signup` en gardant la session anonyme à upgrader).
- Boutons concernés : Télécharger (gallery toolbar + lightbox), Supprimer (autres photos), FAB "Créer un événement", bouton "Inviter" sur l'événement.
- Limite 10 photos : compteur server-side dans `uploadPhoto` (count `photos` WHERE `uploaded_by = userId AND event_id = X`). Au-delà → erreur "Limite invité atteinte, créez un compte pour uploader plus".

## 4. Notification à l'hôte (rappel décisions précédentes)
- Toast/badge in-app quand un nouveau membre rejoint un événement (subscribe realtime sur `event_members`).

---

## Détails techniques

**Migration SQL** :
```sql
ALTER TABLE invites ADD COLUMN secret_code TEXT;
-- backfill : générer pour les invites existants
UPDATE invites SET secret_code = upper(substr(md5(random()::text), 1, 6)) WHERE secret_code IS NULL;
ALTER TABLE invites ALTER COLUMN secret_code SET NOT NULL;
-- expiration 14j par défaut sur nouvelles invites côté serveur
```

**Fichiers modifiés** :
- `src/routes/index.tsx` — landing classique
- `src/routes/auth.tsx` — retirer mode `guest` hors invitation
- `src/routes/join.$token.tsx` — lecture du `?code=`, parcours invité + saisie pseudo
- `src/lib/invites.functions.ts` — génération code, validation, expiration 14j
- `src/components/InviteShareSheet.tsx` — inclure `?code=` dans tous les liens partagés
- `src/components/AuthProvider.tsx` — exposer `isGuest`
- `src/components/GuestGate.tsx` — **nouveau**, popup d'incitation
- `src/components/PhotoGallery.tsx`, `PhotoUploader.tsx`, `CreateMenu.tsx`, `EventEditSheet.tsx` — wrap actions restreintes
- `src/lib/events.functions.ts` (upload) — vérif limite 10 photos pour invités

**Hors scope ici** : magic link (refusé), notification email à l'hôte, suppression auto des photos d'un invité expiré (à décider plus tard).

---

Dis-moi si tu valides ou si tu veux ajuster (ex: nombre max de photos invité, longueur du code, format de l'expiration).