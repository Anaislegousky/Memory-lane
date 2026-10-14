-- Retours des utilisateurs (bugs, idées, autres), envoyés depuis la page /feedback.
-- Aucune règle d'accès n'est créée volontairement : personne ne peut lire ni écrire
-- depuis le navigateur. L'écriture passe par le serveur (clé secrète) et la lecture
-- se fait dans Supabase (Table Editor), qui contourne ces règles.
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- Si la personne supprime son compte, le retour reste mais n'est plus relié à elle.
  user_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('bug', 'idea', 'other')),
  message text not null check (char_length(message) between 5 and 2000),
  contact_email text check (char_length(contact_email) <= 254),
  user_agent text check (char_length(user_agent) <= 300),
  status text not null default 'new' check (status in ('new', 'in_progress', 'done'))
);

alter table public.feedback enable row level security;

create index feedback_created_at_idx on public.feedback (created_at desc);
create index feedback_user_id_idx on public.feedback (user_id, created_at desc);
