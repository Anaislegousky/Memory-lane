-- Bucket de stockage privé pour les photos des événements.
-- Sur Lovable Cloud il avait été créé hors migration : on l'ajoute ici pour que
-- le schéma se recrée entièrement sur un nouveau projet Supabase.
-- Les règles d'accès (RLS sur storage.objects) sont déjà dans les migrations précédentes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-photos', 'event-photos', false, 10485760, array['image/*'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
