## Corrections demandées

### 1. Import multi-photos → un seul événement multi-jours
**Fichier**: `src/lib/exif-import.ts` + `src/components/CreateMenu.tsx`

Actuellement `groupPhotosIntoEvents` regroupe par jour → plusieurs événements. Nouvelle logique :
- **Un seul `EventGroup`** quand l'utilisateur sélectionne plusieurs photos en une fois.
- Calcul de `event_date` = date la plus ancienne, `end_date` = date la plus récente (depuis EXIF).
- GPS : centroïde de toutes les photos géotaguées (si présentes), sinon `null`.
- Geocodage inverse une seule fois pour le centroïde.
- Passer `end_date` à `createEventFn` dans `CreateMenu.tsx` (actuellement forcé à `null`).
- L'aperçu (preview) affiche un seul bloc avec date début + date fin éditables.

### 2. Titre automatique plus court
Format actuel : `"Rennes — 12 septembre 2026"` / `"Souvenirs du 12 septembre 2026"`.

Nouveau format compact :
- Avec lieu, 1 jour : `Rennes · 12 sept`
- Avec lieu, plusieurs jours : `Rennes · 12–14 sept`
- Sans lieu, 1 jour : `Souvenirs · 12 sept`
- Sans lieu, plusieurs jours : `Souvenirs · 12–14 sept`
- Si années différentes : ajout `2026`.

### 3. Boutons de partage WhatsApp/Telegram/Messenger/SMS/Email
**Fichier**: `src/components/InviteShareSheet.tsx`

Pas besoin d'API. Le problème vient de `window.open(...)` sur mobile : Safari iOS bloque souvent les nouvelles fenêtres ouvertes programmatiquement, et `sms:`/`mailto:` via `window.location.href` peuvent être ignorés depuis un overlay.

Correctif :
- Remplacer les `<button onClick={openExternal(...)}>` par de vrais **`<a href="…" target="_blank" rel="noopener">`** stylés comme des boutons. Les liens ancrés conservent le geste utilisateur et fonctionnent nativement avec les schémas `whatsapp://`, `sms:`, `mailto:`, `tg://`.
- Désactiver l'ancre tant que `link` n'est pas généré (via `aria-disabled` + `pointer-events: none`).
- Retirer Messenger (nécessite un vrai `app_id` Facebook enregistré — actuellement le `140586622674265` factice ne fonctionne pas). Remplacer par l'icône "Partager…" natif (`navigator.share`) qui couvre Messenger sur mobile.

### 4. Boutons « Ajouter » et caméra dans l'événement
**Fichier**: `src/components/PhotoUploader.tsx`

Les inputs cachés utilisent `className="hidden"` (display:none). Sur certains WebView/Safari iOS, déclencher `.click()` sur un input `display:none` est bloqué.

Correctif : remplacer `hidden` par un style « visually hidden » (positionnement absolu, opacité 0) afin que `inputRef.current.click()` soit toujours honoré sur mobile.

### Vérification
Après build :
- Importer 5 photos prises sur 3 jours → 1 seul événement multi-jours créé avec titre court.
- Cliquer WhatsApp / Telegram / SMS / Email depuis mobile → ouvre l'app correspondante.
- Cliquer Ajouter / Caméra dans la page événement → ouvre la galerie / la caméra.
