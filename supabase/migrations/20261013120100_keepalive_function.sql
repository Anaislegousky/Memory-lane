-- Fonction minuscule appelée chaque semaine par GitHub Actions (.github/workflows/maintenance.yml)
-- pour que le projet Supabase gratuit ne soit pas mis en pause faute d'activité.
-- Elle ne lit aucune donnée.
create or replace function public.keepalive()
returns integer
language sql
stable
set search_path = ''
as $$ select 1 $$;

revoke all on function public.keepalive() from public;
grant execute on function public.keepalive() to anon, authenticated, service_role;
