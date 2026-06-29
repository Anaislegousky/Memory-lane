# Plan

## 1. Rafraîchir automatiquement les miniatures de la carte

La query `["events-map"]` n'est jamais invalidée quand on ajoute/supprime des photos.

- **`PhotoUploader.tsx`** : ajouter `const queryClient = useQueryClient()` et invalider `["events-map"]` après chaque upload réussi (en plus des invalidations photos existantes).
- **`PhotoGallery.tsx`** : même invalidation après suppression (simple et en masse).
- **`_authenticated.map.tsx`** : `refetchOnMount: "always"` pour des miniatures fraîches au retour sur l'onglet Carte.

## 2. Lien de confirmation Gmail qui ne fonctionne pas

**Cause probable.** Dans `auth.tsx`, on passe `emailRedirectTo: window.location.origin`. Le lien atterrit sur `/`, qui ne traite ni le `?code=...` (PKCE) ni le hash `#access_token=...`. Sur Gmail mobile le lien s'ouvre souvent dans une webview in-app qui ne partage pas le `localStorage` → la session n'est jamais persistée.

**Correctif :**
- Créer une route **publique** `src/routes/auth.callback.tsx` qui :
  - Tente `supabase.auth.exchangeCodeForSession(window.location.href)` (PKCE) ; fallback lecture du hash + `setSession()` si format implicite
  - Affiche « Confirmation en cours… » puis redirige vers `/events` une fois la session établie
  - En cas d'erreur (lien expiré/déjà utilisé), affiche un message clair + bouton « Renvoyer un e-mail »
- Mettre à jour `signUp(...)` dans `auth.tsx` pour utiliser `emailRedirectTo: ${window.location.origin}/auth/callback`
- Ajouter un bouton **« Renvoyer l'e-mail de confirmation »** sur `/auth` (`supabase.auth.resend({ type: 'signup', email })`) pour débloquer l'utilisateur Gmail déjà coincé
- Whitelister `https://good-time-frame.lovable.app/auth/callback` (+ URL preview) côté backend

⚠️ Je ne peux pas forcer Gmail à ouvrir le lien dans le navigateur système, mais le callback dédié + le bouton « Renvoyer » couvrent le cas.

## 3. Accès aux données utilisateurs & aux bugs

3 options, dis-moi laquelle (ou lesquelles) tu veux :

**a) Backend viewer (déjà dispo, zéro setup)** — bouton « View Backend » dans Lovable : voir users, événements, photos, invitations, logs auth, logs DB. Le plus simple pour tes 6 amis en test.

**b) Amplitude (analytics produit)** — j'intègre `@amplitude/analytics-browser` et je track les events clés : `signup`, `event_created`, `photos_uploaded`, `invite_sent`, `invite_redeemed`, `photo_downloaded`. Il me faut **ta clé API Amplitude** (Project Settings → API Keys), je la stockerai en `VITE_AMPLITUDE_API_KEY`. L'init sera conditionnée au consentement cookies (RGPD) via ton `CookieBanner`.

**c) Sentry (bugs runtime)** — plus adapté qu'Amplitude pour traquer erreurs JS, stack traces et erreurs réseau. Recommandé en parallèle d'Amplitude.

→ **Question** : tu veux (a) seulement, (a+b), (a+c), ou les trois ? Si (b), envoie-moi la clé Amplitude.

## Détails techniques

- queryKey carte : `["events-map"]` dans `_authenticated.map.tsx`
- Nouveau fichier : `src/routes/auth.callback.tsx` (route publique, hors `_authenticated/`)
- Module Amplitude : `src/lib/amplitude.ts` chargé après consentement cookies
