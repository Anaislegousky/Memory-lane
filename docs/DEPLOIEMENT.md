# Mettre Memories en ligne hors de Lovable

Ce guide explique, étape par étape, comment faire tourner Memories gratuitement :

| Rôle | Service | Où sont les serveurs |
| --- | --- | --- |
| Base de données, comptes, photos | **Supabase** (plan gratuit) | Paris (`eu-west-3`) |
| Site web | **Vercel** (plan Hobby, usage perso non commercial) | Paris (`cdg1`) pour le serveur |
| Mesure d'audience (facultatif) | **PostHog** Cloud UE | Francfort |
| Code et tâches automatiques | **GitHub** | — |

Comptez environ une heure. Rien n'est à installer sur votre ordinateur : tout se fait dans le navigateur.

> **Vocabulaire**
> - *Variable d'environnement* : un réglage (adresse, clé…) donné à l'application sans l'écrire dans le code.
> - *Clé publique* : peut être vue par tout le monde, ce n'est pas grave.
> - *Clé secrète* : donne tous les droits. Ne la collez **jamais** dans un message, un e-mail ou le code.

---

## Étape 0 — Sécuriser vos comptes (2FA)

Pour **chaque** service ci-dessous (GitHub, Supabase, Vercel, PostHog), activez la double
authentification (« 2FA ») juste après la création du compte, avec une application comme
Google Authenticator, Microsoft Authenticator ou 2FAS. Gardez les codes de secours dans un endroit sûr
(gestionnaire de mots de passe, papier rangé).

- GitHub : *Settings → Password and authentication → Two-factor authentication*.
- Supabase : avatar → *Account preferences → Multi-factor authentication*.
- Vercel : *Account Settings → Authentication → Two-Factor Authentication*.
- PostHog : *Settings → User → Two-factor authentication*.

Astuce : créez les comptes Vercel et Supabase **avec « Continuer avec GitHub »**. Ainsi, la 2FA de
GitHub protège aussi ces comptes.

---

## Étape 1 — Créer la base Supabase à Paris

1. Allez sur <https://supabase.com/dashboard> et créez un compte (ou connectez-vous avec GitHub).
2. **New project** :
   - *Name* : `memory-lane`
   - *Database password* : cliquez sur **Generate a password** et enregistrez-le dans votre
     gestionnaire de mots de passe.
   - *Region* : **West EU (Paris)** — c'est `eu-west-3`.
   - Plan : **Free**.
3. Attendez 1 à 2 minutes que le projet soit prêt.

### 1.a Recréer les tables (le « schéma »)

La base est vide. Il faut lui donner la structure de Memories, décrite dans le dossier
`supabase/migrations/` du code.

1. Dans Supabase, menu de gauche : **SQL Editor** → **New query**.
2. Ouvrez sur GitHub le premier fichier de `supabase/migrations/`, copiez tout son contenu,
   collez-le dans l'éditeur et cliquez sur **Run**. Le message doit être « Success ».
3. Recommencez avec chaque fichier, **dans cet ordre exact** (l'ordre des noms) :
   1. `20260623153218_…sql` (tables principales)
   2. `20260623153254_…sql`
   3. `20260623153714_…sql`
   4. `20260623194638_…sql`
   5. `20260623203119_…sql`
   6. `20260623211209_…sql`
   7. `20260623211227_…sql`
   8. `20260630010727_…sql`
   9. `20261013120000_create_event_photos_bucket.sql` (espace de stockage des photos)
   10. `20261013120100_keepalive_function.sql` (évite la mise en pause)
4. Vérifiez : menu **Table Editor** → vous devez voir `events`, `photos`, `profiles`, etc.
   Menu **Storage** → un bucket `event-photos` marqué *Private*.

> Si un fichier affiche une erreur, arrêtez-vous et copiez le message d'erreur dans la conversation :
> on corrigera ensemble.

### 1.b Régler la connexion des utilisateurs

Menu **Authentication** :

1. **Sign In / Providers** :
   - *Email* : activé (c'est le cas par défaut). Laissez « Confirm email » activé.
   - **Allow anonymous sign-ins** : **activez-le**. C'est ce qui permet aux invités de rejoindre un
     événement via un lien sans créer de compte.
2. **URL Configuration** (à faire après l'étape 2, quand vous connaissez l'adresse du site) :
   - *Site URL* : `https://VOTRE-SITE.vercel.app`
   - *Redirect URLs* : ajoutez `https://VOTRE-SITE.vercel.app/**`
     (et `http://localhost:8080/**` seulement si quelqu'un fait tourner l'app sur son ordinateur).

> **Limite d'e-mails** : le service d'e-mail fourni par Supabase n'envoie que quelques e-mails par
> heure (confirmation d'inscription, mot de passe oublié). Pour quelques proches, ça suffit. Si cela
> devient gênant, on pourra brancher un service d'envoi européen gratuit (par ex. Brevo, français).

### 1.c Récupérer les clés

Menu **Project Settings → API Keys** (et **Data API** pour l'URL). Notez :

| Nom | Où le trouver | Type |
| --- | --- | --- |
| URL du projet | *Data API → Project URL* (`https://xxxx.supabase.co`) | publique |
| Clé publique | *API Keys → Publishable key* (`sb_publishable_…`) | publique |
| Clé secrète | *API Keys → Secret keys* (`sb_secret_…`) | **SECRÈTE** |

---

## Étape 2 — Mettre le site en ligne sur Vercel

1. Allez sur <https://vercel.com/signup>, choisissez **Hobby** et **Continue with GitHub**.
2. **Add New… → Project** → importez le dépôt `Memory-lane` (autorisez Vercel à y accéder si demandé).
3. Avant de cliquer sur *Deploy* :
   - *Framework Preset* : laissez la détection automatique (Vite, Nitro ou Other : les trois
     marchent). Ne changez pas les commandes de build : les interrupteurs *Override* restent éteints.
   - Ouvrez **Environment Variables** et ajoutez les variables du tableau ci-dessous.
     Collez les valeurs **sans guillemets**, et laissez cochés *Production*, *Preview* et *Development*.
   - **Branche :** tant que les changements ne sont pas fusionnés, la branche `main` contient
     encore l'ancienne version Lovable, qui ne se construit pas sur Vercel. Si l'écran propose
     de choisir la branche, prenez `claude/hopeful-bardeen-ddyvra`. Sinon, ce n'est pas grave :
     voir « Vérifier » plus bas.
4. Cliquez sur **Deploy**. Au bout de 2 à 3 minutes, Vercel affiche l'adresse du site
   (par ex. `memory-lane-xxxx.vercel.app`). Vous pouvez choisir un nom plus joli dans
   *Settings → Domains* (gratuit si l'adresse se termine par `.vercel.app`).

### Variables d'environnement Vercel

| Nom | Valeur | Remarque |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | URL du projet Supabase | publique |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | clé `sb_publishable_…` | publique |
| `SUPABASE_URL` | la même URL | lue par le serveur |
| `SUPABASE_PUBLISHABLE_KEY` | la même clé publique | lue par le serveur |
| `SUPABASE_SERVICE_ROLE_KEY` | clé `sb_secret_…` | **secrète**, cochez *Sensitive* |
| `CRON_SECRET` | une longue chaîne aléatoire (voir ci-dessous) | **secrète**, cochez *Sensitive* |
| `VITE_POSTHOG_KEY` | clé `phc_…` de PostHog (étape 3) | facultatif |
| `VITE_POSTHOG_HOST` | `https://eu.i.posthog.com` | facultatif |

Pour fabriquer `CRON_SECRET` : allez sur <https://www.random.org/strings/> et générez
**2 chaînes de 20 caractères** (chiffres + lettres majuscules et minuscules), puis collez-les bout à bout
pour obtenir 40 caractères. Gardez cette valeur dans votre gestionnaire de mots de passe : elle
servira aussi à l'étape 4. (Il faut au moins 32 caractères, sinon le nettoyage refuse de tourner.)

> **Important** : les variables qui commencent par `VITE_` sont visibles dans le navigateur.
> Ne mettez **jamais** `VITE_` devant la clé secrète Supabase ni devant `CRON_SECRET`.

### Ne pas utiliser l'intégration « Supabase » de Vercel

Vercel propose des boutons du genre *Add Supabase*, *Storage* ou *Marketplace → Supabase*.
**N'y touchez pas.** Ils créeraient un nouveau projet ou de nouvelles variables avec d'autres noms
(`POSTGRES_URL`, `SUPABASE_ANON_KEY`…) que l'application ne lit pas, et pas forcément à Paris.
Votre projet Supabase existe déjà et l'espace photos (`event-photos`) est déjà créé dans Supabase
par la migration n° 9 : on relie les deux en recopiant à la main les variables du tableau ci-dessus.
Si ces variables ont été ajoutées par erreur par l'intégration, supprimez-les (*Settings →
Integrations*) et gardez uniquement les vôtres.

### Vérifier que l'étape 3 est bien faite

1. **Variables** : *Settings → Environment Variables*. Vous devez voir 6 noms (8 avec PostHog), écrits
   exactement comme dans le tableau (majuscules, sans espace). Les valeurs des variables *Sensitive*
   s'affichent masquées : c'est normal.
2. **Bonne branche** : onglet *Deployments*. Le déploiement doit porter le nom de branche
   `claude/hopeful-bardeen-ddyvra` et l'étiquette *Production*. Sinon : *Settings → Git → Production
   Branch* (ou *Settings → Environments → Production → Branch Tracking*, selon la version de
   l'interface), mettez cette branche, puis *Deployments → ⋯ → Redeploy*.
3. **Construction réussie** : cliquez sur le déploiement. Il doit être *Ready* (vert). En cas
   d'échec, ouvrez *Build Logs* et copiez les dernières lignes rouges dans la conversation.
4. **Le site répond** : ouvrez l'adresse du site, puis `/privacy`. Si une page affiche
   « Missing Supabase environment variable(s) : … », le message nomme la variable oubliée ou mal
   écrite. Corrigez-la, puis *Redeploy* (une variable modifiée n'agit qu'après un nouveau déploiement).
5. **Test complet des clés secrètes** : *Settings → Cron Jobs*. La tâche
   `/api/public/hooks/cleanup-photos` doit y apparaître. Cliquez sur **Run** : le résultat doit être
   `200` (réponse `{"deleted":0}` dans les *Logs*). Cela prouve que `CRON_SECRET`,
   `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont corrects. Si le résultat est `401`,
   `CRON_SECRET` manque ou fait moins de 32 caractères ; si c'est `500`, regardez l'URL et la clé
   secrète Supabase.
   (Les tâches planifiées n'existent que sur le déploiement *Production*, d'où le point 2.)

### Régions et branche

- *Settings → Functions → Function Region* : vérifiez que **Paris, France (cdg1)** est sélectionné
  (le code le demande déjà, ce réglage le confirme).
- *Settings → Git → Production Branch* : pendant la phase de test, indiquez la branche de travail
  (celle qui contient ces changements). Une fois tout validé et la branche fusionnée dans `main`,
  remettez `main`.
- Après chaque modification de variable, relancez un déploiement : *Deployments → ⋯ → Redeploy*.

### Tâche automatique hebdomadaire

Chaque lundi vers 3 h du matin, Vercel lance tout seul le nettoyage des photos expirées (plus de
90 jours). C'est configuré dans `vite.config.ts` et visible dans *Settings → Cron Jobs*. Rien à faire,
à part avoir défini `CRON_SECRET`.

Pourquoi une fois par semaine et pas moins ? Ce passage sert aussi à « réveiller » Supabase : un projet
gratuit se met en pause après 7 jours sans activité. Une fois par semaine est donc le minimum.

---

## Étape 3 — Mesure d'audience PostHog (facultatif)

Sans cette étape, l'application marche normalement, sans aucune mesure d'audience, et la bannière
de cookies ne s'affiche pas.

1. Créez un compte sur <https://eu.posthog.com/signup> — **vérifiez bien le `eu.`** dans l'adresse :
   c'est ce qui garantit l'hébergement des données en Europe.
2. Créez un projet `Memories`.
3. *Settings → Project → General* : copiez la **Project API Key** (`phc_…`, publique).
4. Dans *Settings → Project → Replay*, laissez l'enregistrement de sessions **désactivé**.
5. Ajoutez `VITE_POSTHOG_KEY` et `VITE_POSTHOG_HOST` dans Vercel, puis *Redeploy*.

Ce que fait l'application :
- rien n'est chargé tant que la personne n'a pas cliqué sur **Accepter** ;
- les boutons « Accepter » et « Refuser » ont la même apparence (recommandation CNIL) ;
- sont mesurés : les pages visitées et les clics sur les boutons et les liens ;
- le libellé des boutons est gardé (« Inviter », « Télécharger »…), mais jamais le texte des liens
  (qui contient les noms d'événements) ni les liens d'invitation secrets ;
- pas d'enregistrement d'écran ;
- chacun peut changer d'avis depuis la page *Politique de confidentialité*.

### Voir les statistiques

Connectez-vous sur <https://eu.posthog.com> avec votre compte :
- **Activity** : la liste des événements en direct (pages vues `$pageview`, clics `$autocapture`).
- **Web analytics** : tableau de bord tout prêt (visiteurs, pages les plus vues, appareils, pays).
- **Product analytics → New insight** : par exemple, compter les clics sur le bouton « Inviter ».

Seules les personnes ayant accepté la bannière apparaissent : les chiffres sont donc partiels.

---

## Étape 4 — Bouton de maintenance GitHub (facultatif)

Un bouton dans GitHub permet de lancer le nettoyage à la main et de réveiller Supabase, par exemple
pour tester, ou si le site a été en panne plusieurs jours. Il ne se lance jamais tout seul.

1. Sur GitHub, dans le dépôt : *Settings → Secrets and variables → Actions → New repository secret*.
2. Créez ces 4 secrets :

| Nom | Valeur |
| --- | --- |
| `APP_URL` | l'adresse du site, sans `/` à la fin (ex. `https://memory-lane.vercel.app`) |
| `CRON_SECRET` | la **même** valeur que sur Vercel |
| `SUPABASE_URL` | l'URL du projet Supabase |
| `SUPABASE_PUBLISHABLE_KEY` | la clé publique `sb_publishable_…` |

3. Pour l'utiliser : onglet **Actions → Maintenance → Run workflow**. Après une minute, une coche
   verte doit apparaître. (Le bouton apparaît une fois les changements fusionnés dans `main`.)

---

## Étape 5 — Tester

1. Ouvrez le site, créez un compte de test, confirmez l'e-mail.
2. Créez un événement, ajoutez 2 ou 3 photos, vérifiez la carte.
3. Générez un lien d'invitation, ouvrez-le dans une fenêtre de navigation privée et rejoignez
   l'événement en invité.
4. Page *Profil* : testez l'export de vos données.
5. Si PostHog est configuré : acceptez la bannière, naviguez, et vérifiez dans PostHog
   (*Activity*) que les pages et les clics apparaissent, avec `/join/:token` à la place des vrais
   liens.

---

## Étape 6 — Quitter Lovable (seulement quand tout marche)

1. Utilisez la nouvelle version quelques jours.
2. Fusionnez la branche de travail dans `main` (par une *pull request* sur GitHub), puis remettez
   `main` comme *Production Branch* sur Vercel.
3. Dans Lovable, déconnectez GitHub du projet, puis résiliez l'abonnement. L'ancienne version
   hébergée par Lovable (et sa base Lovable Cloud) s'arrêtera : prévenez vos proches de la nouvelle
   adresse.

---

## Sauvegardes

Le plan gratuit de Supabase **ne fait pas de sauvegarde automatique**. Une fois par mois par exemple,
demandez simplement « fais une sauvegarde de la base » dans la conversation : la sauvegarde se fait
avec l'outil `pg_dump` et la chaîne de connexion de *Project Settings → Database*. Les photos, elles,
ne sont pas sauvegardées (elles sont de toute façon supprimées au bout de 90 jours) : chacun peut les
télécharger depuis l'événement.

## Limites des offres gratuites (octobre 2026)

- **Supabase** : 500 Mo de base, 1 Go de photos, 5 Go de trafic par mois, 50 Mo max par fichier
  (l'app limite à 10 Mo et compresse les photos à 1,5 Mo), 2 projets actifs.
- **Vercel Hobby** : usage personnel non commercial uniquement ; tâches planifiées une fois par jour
  maximum.
- **PostHog** : 1 million d'événements par mois gratuits.

## Faire tourner l'app sur un ordinateur (pour un développeur)

```sh
cp .env.example .env   # puis remplir les valeurs
bun install
bun run dev            # http://localhost:8080
bun run build          # vérifie que la version Vercel se construit
```
