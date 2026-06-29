## Intégration Amplitude (autocapture)

Ce projet est en TanStack Start : il n'y a pas de `index.html` éditable avec un `</head>`. Le `<head>` est géré dans `src/routes/__root.tsx` via `HeadContent`. Le snippet Amplitude sera injecté là, ce qui équivaut à l'injecter juste avant `</head>`.

### Changements

1. **`src/routes/__root.tsx`** — ajouter dans `head().scripts` deux scripts chargés en tête de page :
   - `https://cdn.amplitude.com/script/b4d90f23bde8f02a3a37ea9c2f558431.js` (snippet officiel d'autocapture)
   - Un petit script inline qui appelle :
     ```js
     window.amplitude.add(window.sessionReplay.plugin({ sampleRate: 1 }));
     window.amplitude.init('b4d90f23bde8f02a3a37ea9c2f558431', {
       autocapture: { pageViews: true, sessions: true, elementInteractions: true }
     });
     ```
   - Autocapture activée : **page views**, **clicks** (elementInteractions), **sessions**. Form interactions / file downloads laissés à false par défaut (non demandés).

2. **Clé API en clair dans le code** : la clé Amplitude est publique (équivalent d'une publishable key, conçue pour tourner côté navigateur), donc OK en dur dans `__root.tsx`. Pas besoin de la stocker comme secret.

3. Aucun autre fichier modifié, aucune dépendance ajoutée (le CDN charge tout).

### Vérification après build

- Onglet Network : requête vers `cdn.amplitude.com/script/b4d90f23…js` au chargement.
- Console : `window.amplitude` défini.
- Dashboard Amplitude : événements `[Amplitude] Page Viewed`, `[Amplitude] Element Clicked`, `[Amplitude] Session Start` qui remontent.
