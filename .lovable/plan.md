## Objectifs

Réduire la friction à 3 endroits clés : invitation, création de compte, et longueur de session. Alléger la home.

## 1. Invitation rapide façon "share sheet" (priorité événement)

Refondre `InviteShareSheet.tsx` pour générer le lien **immédiatement à l'ouverture** (plus de bouton « Créer le lien »).

Grille d'actions one-tap (icônes rondes colorées, style screenshots) :
- **Copier** → `navigator.clipboard`
- **WhatsApp** → `https://wa.me/?text=<msg+url>`
- **Messenger** → `fb-messenger://share?link=` (fallback `https://www.messenger.com/`)
- **Telegram** → `https://t.me/share/url?url=...&text=...`
- **Email** → `mailto:?subject=...&body=...`
- **SMS** → `sms:?body=...`
- **Partager…** → `navigator.share()` (système natif iOS/Android, fallback masqué desktop)

Le lien est pré-créé en `useEffect` au montage (état `creating → ready`). Pendant ~300ms les boutons sont désactivés avec spinner discret. URL toujours visible en bas, copiable.

Idem pour invitation réseau (scope=network), même UI.

## 2. « Continuer avec un pseudo » (sans email)

Sur `/auth`, ajouter une 3e option en plus de Sign in / Sign up :

```
[ Continuer avec un pseudo ]   ← bouton secondaire mis en avant
```

Flow :
1. Champ unique « Votre prénom ou pseudo »
2. Clic → `supabase.auth.signInAnonymously()` avec `options.data.display_name = pseudo`
3. Le trigger `handle_new_user` existant remplit déjà `profiles.display_name`
4. Redirige vers `redirect` (ou `/events`)

Activation backend : `external_anonymous_users_enabled: true` via `supabase--configure_auth`.

Sur le profil, ajouter un bandeau « Sauvegarder mon compte » qui propose de lier un email + mot de passe (`supabase.auth.updateUser({ email, password })`) pour ne pas perdre l'accès. Pas bloquant.

Note GDPR : ajouter ligne dans `/privacy` expliquant le mode invité (données liées à un identifiant anonyme, perdues si effacement du navigateur).

## 3. Session 30 jours

Le JWT access token reste court (1h, non modifiable côté client), mais le **refresh token** peut durer 30 jours. Configuration via `supabase--configure_auth` n'expose pas directement ça → il faut ajuster via le service auth. Plan :
- Activer `autoRefreshToken: true` (déjà fait dans `client.ts`)
- Demander d'étendre `jwt_exp` côté projet n'est pas exposé sur Lovable Cloud ; le refresh token par défaut est déjà long (~30j inactivité + 60j absolue chez Supabase). Vérifier `supabase/config.toml` et étendre `[auth] jwt_expiry` si possible (sinon documenter la limite).
- Ajouter un `visibilitychange` listener qui appelle `supabase.auth.refreshSession()` au retour sur l'app pour éviter toute expiration ressentie.

## 4. Alléger la home (`src/routes/index.tsx`)

- Réduire le hero : titre court + 1 sous-titre court (au lieu du paragraphe actuel)
- Supprimer / fusionner les sections secondaires redondantes
- Garder : tagline, 1 CTA principal « Commencer », 1 lien discret « J'ai déjà un compte »
- Optionnel : 3 mini-features en 1 ligne d'icônes (au lieu de blocs textuels)

## Détails techniques

| Fichier | Action |
|---|---|
| `src/components/InviteShareSheet.tsx` | Refonte UI : grille 6 boutons, auto-création du lien au mount |
| `src/routes/auth.tsx` | Ajouter bouton « Continuer avec un pseudo » + petit form pseudo |
| `src/routes/_authenticated.profile.tsx` | Bandeau « Sauvegarder mon compte » si `user.is_anonymous` |
| `src/routes/index.tsx` | Réduire le contenu textuel |
| `src/routes/privacy.tsx` | Paragraphe mode invité |
| Backend | `configure_auth` → `external_anonymous_users_enabled: true` |
| `src/routes/__root.tsx` ou provider | Listener `visibilitychange` → `refreshSession()` |

## Points de confirmation

- OK pour activer **l'auth anonyme Supabase** (un compte est techniquement créé mais sans email/mdp) ?
- Sur la home, je peux te montrer 2 versions (très épurée vs modérée) ou je tranche direct ?