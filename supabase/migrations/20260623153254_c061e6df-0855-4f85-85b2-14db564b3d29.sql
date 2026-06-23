
-- Tighten SECURITY DEFINER helpers (still callable by RLS / authenticated)
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.is_event_member(uuid, uuid) from public, anon;
revoke execute on function public.is_event_owner(uuid, uuid) from public, anon;
revoke execute on function public.photo_event_id(uuid) from public, anon;
revoke execute on function public.add_owner_as_member() from public, anon;

-- Storage RLS for event-photos bucket
create policy "event_photos select by members" on storage.objects for select to authenticated
  using (
    bucket_id = 'event-photos'
    and public.is_event_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );

create policy "event_photos insert by members" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'event-photos'
    and public.is_event_member(((storage.foldername(name))[1])::uuid, auth.uid())
    and owner = auth.uid()
  );

create policy "event_photos delete by uploader or owner" on storage.objects for delete to authenticated
  using (
    bucket_id = 'event-photos'
    and (
      owner = auth.uid()
      or public.is_event_owner(((storage.foldername(name))[1])::uuid, auth.uid())
    )
  );
