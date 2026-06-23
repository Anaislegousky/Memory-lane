
-- 1) Friendships
DROP POLICY IF EXISTS "friendships insert own" ON public.friendships;

-- 2) Invites used_count lockdown
REVOKE UPDATE ON public.invites FROM authenticated;
GRANT UPDATE (event_id, scope, token, max_uses, expires_at) ON public.invites TO authenticated;

-- 3) Move SECURITY DEFINER helpers to a private schema
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, anon, service_role;

ALTER FUNCTION public.is_event_owner(uuid, uuid)        SET SCHEMA private;
ALTER FUNCTION public.is_event_member(uuid, uuid)       SET SCHEMA private;
ALTER FUNCTION public.photo_event_id(uuid)              SET SCHEMA private;
ALTER FUNCTION public.has_role(uuid, public.app_role)   SET SCHEMA private;

-- events
DROP POLICY IF EXISTS "events members can read" ON public.events;
CREATE POLICY "events members can read" ON public.events FOR SELECT
  USING (private.is_event_member(id, auth.uid()));

-- event_members
DROP POLICY IF EXISTS "members read same event" ON public.event_members;
CREATE POLICY "members read same event" ON public.event_members FOR SELECT
  USING (private.is_event_member(event_id, auth.uid()));

DROP POLICY IF EXISTS "members insert by owner" ON public.event_members;
CREATE POLICY "members insert by owner" ON public.event_members FOR INSERT
  WITH CHECK (private.is_event_owner(event_id, auth.uid()));

DROP POLICY IF EXISTS "members leave self" ON public.event_members;
CREATE POLICY "members leave self" ON public.event_members FOR DELETE
  USING (user_id = auth.uid() OR private.is_event_owner(event_id, auth.uid()));

-- photos
DROP POLICY IF EXISTS "photos read by members" ON public.photos;
CREATE POLICY "photos read by members" ON public.photos FOR SELECT
  USING (private.is_event_member(event_id, auth.uid()));

DROP POLICY IF EXISTS "photos insert by members" ON public.photos;
CREATE POLICY "photos insert by members" ON public.photos FOR INSERT
  WITH CHECK (private.is_event_member(event_id, auth.uid()) AND uploader_id = auth.uid());

DROP POLICY IF EXISTS "photos delete by uploader or owner" ON public.photos;
CREATE POLICY "photos delete by uploader or owner" ON public.photos FOR DELETE
  USING (uploader_id = auth.uid() OR private.is_event_owner(event_id, auth.uid()));

-- photo_tags
DROP POLICY IF EXISTS "tags read by event members" ON public.photo_tags;
CREATE POLICY "tags read by event members" ON public.photo_tags FOR SELECT
  USING (private.is_event_member(private.photo_event_id(photo_id), auth.uid()));

DROP POLICY IF EXISTS "tags insert by event member, self as tagger, tagged is member" ON public.photo_tags;
CREATE POLICY "tags insert by event member, self as tagger, tagged is member" ON public.photo_tags FOR INSERT
  WITH CHECK (
    tagger_id = auth.uid()
    AND private.is_event_member(private.photo_event_id(photo_id), auth.uid())
    AND private.is_event_member(private.photo_event_id(photo_id), tagged_user_id)
  );

-- invites
DROP POLICY IF EXISTS "invites insert by self" ON public.invites;
CREATE POLICY "invites insert by self" ON public.invites FOR INSERT
  WITH CHECK (inviter_id = auth.uid() AND (scope = 'network' OR private.is_event_owner(event_id, auth.uid())));

-- Lock down EXECUTE on the moved helpers
REVOKE ALL ON FUNCTION private.is_event_owner(uuid, uuid)         FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_event_member(uuid, uuid)        FROM PUBLIC;
REVOKE ALL ON FUNCTION private.photo_event_id(uuid)               FROM PUBLIC;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role)    FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_event_owner(uuid, uuid)      TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_event_member(uuid, uuid)     TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.photo_event_id(uuid)            TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
