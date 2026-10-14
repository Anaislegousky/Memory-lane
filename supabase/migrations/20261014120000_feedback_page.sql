-- Ajoute la page où se trouvait la personne quand elle a envoyé son retour
-- (chemin nettoyé côté serveur : jamais de jeton d'invitation ni d'identifiant).
alter table public.feedback
  add column page text check (char_length(page) <= 100);
