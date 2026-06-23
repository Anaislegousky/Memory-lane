## Ignorer le finding de sécurité « race condition sur les invitations »

**Contexte** : la faille décrite n'est exploitable que si une invitation a une `max_uses` définie ET que plusieurs utilisateurs la consomment exactement en même temps. À ce stade :
- Aucun volume d'utilisateurs réels.
- `max_uses` est nullable sans valeur par défaut → les invitations actuelles sont illimitées, donc la limite ne s'applique pas.
- Aucune donnée sensible exposée.

**Action**
1. Marquer le finding `invite_redemptions_race_condition` comme **ignoré** via l'outil sécurité, avec une note expliquant le contexte (faible volume + max_uses peu/pas utilisée).
2. Mettre à jour la **security memory** pour :
   - documenter cette décision et son contexte,
   - rappeler qu'avant un lancement public il faudra appliquer la vraie correction (trigger Postgres atomique sur `used_count` vs `max_uses`, ou verrou `FOR UPDATE` dans `redeemInvite`).

**Pas de changement de code applicatif ni de schéma DB** dans ce plan.
