-- 1. Lock down SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.add_owner_as_member() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_event_owner(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_event_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.photo_event_id(uuid) FROM PUBLIC, anon;

-- 2. UPDATE policy on event-photos storage bucket
CREATE POLICY "event_photos update by uploader or owner"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'event-photos'
    AND (owner = auth.uid() OR public.is_event_owner(((storage.foldername(name))[1])::uuid, auth.uid()))
  )
  WITH CHECK (
    bucket_id = 'event-photos'
    AND (owner = auth.uid() OR public.is_event_owner(((storage.foldername(name))[1])::uuid, auth.uid()))
  );

-- 3. INSERT policy on friendships (must involve self)
CREATE POLICY "friendships insert own"
  ON public.friendships
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

-- 4. INSERT policy on invite_redemptions (self, invite must be valid)
CREATE POLICY "redemptions insert valid"
  ON public.invite_redemptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.invites i
      WHERE i.id = invite_redemptions.invite_id
        AND (i.expires_at IS NULL OR i.expires_at > now())
        AND (i.max_uses IS NULL OR i.used_count < i.max_uses)
    )
  );