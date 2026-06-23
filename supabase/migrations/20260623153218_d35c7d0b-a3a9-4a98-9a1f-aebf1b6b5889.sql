
-- Enums & roles
create type public.app_role as enum ('admin','user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id=_user_id and role=_role)
$$;

create policy "view own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create policy "profiles read all authed" on public.profiles for select to authenticated using (true);
create policy "profiles insert own" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles update own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles delete own" on public.profiles for delete to authenticated using (auth.uid() = id);

-- Events
create table public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  event_date date,
  location_label text,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.events to authenticated;
grant all on public.events to service_role;
alter table public.events enable row level security;

-- Event members
create table public.event_members (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
grant select, insert, delete on public.event_members to authenticated;
grant all on public.event_members to service_role;
alter table public.event_members enable row level security;

-- security-definer helper to avoid RLS recursion
create or replace function public.is_event_member(_event_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.event_members where event_id=_event_id and user_id=_user_id)
$$;

create or replace function public.is_event_owner(_event_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.events where id=_event_id and owner_id=_user_id)
$$;

-- Auto-add owner as member on event create
create or replace function public.add_owner_as_member()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.event_members (event_id, user_id, role) values (new.id, new.owner_id, 'owner');
  return new;
end$$;
create trigger trg_event_owner_member after insert on public.events
  for each row execute function public.add_owner_as_member();

-- Events policies (after helper exists)
create policy "events members can read" on public.events for select to authenticated
  using (public.is_event_member(id, auth.uid()));
create policy "events insert own" on public.events for insert to authenticated
  with check (auth.uid() = owner_id);
create policy "events update by owner" on public.events for update to authenticated
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "events delete by owner" on public.events for delete to authenticated
  using (auth.uid() = owner_id);

-- Event members policies
create policy "members read same event" on public.event_members for select to authenticated
  using (public.is_event_member(event_id, auth.uid()));
create policy "members insert by owner" on public.event_members for insert to authenticated
  with check (public.is_event_owner(event_id, auth.uid()));
create policy "members leave self" on public.event_members for delete to authenticated
  using (user_id = auth.uid() or public.is_event_owner(event_id, auth.uid()));

-- Photos
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  uploader_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  width int,
  height int,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 days')
);
create index photos_event_idx on public.photos(event_id, created_at desc);
create index photos_expires_idx on public.photos(expires_at);
grant select, insert, update, delete on public.photos to authenticated;
grant all on public.photos to service_role;
alter table public.photos enable row level security;

create policy "photos read by members" on public.photos for select to authenticated
  using (public.is_event_member(event_id, auth.uid()));
create policy "photos insert by members" on public.photos for insert to authenticated
  with check (public.is_event_member(event_id, auth.uid()) and uploader_id = auth.uid());
create policy "photos delete by uploader or owner" on public.photos for delete to authenticated
  using (uploader_id = auth.uid() or public.is_event_owner(event_id, auth.uid()));

-- Photo tags
create table public.photo_tags (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.photos(id) on delete cascade,
  tagged_user_id uuid not null references auth.users(id) on delete cascade,
  tagger_id uuid not null references auth.users(id) on delete cascade,
  x double precision,
  y double precision,
  created_at timestamptz not null default now(),
  unique (photo_id, tagged_user_id)
);
grant select, insert, delete on public.photo_tags to authenticated;
grant all on public.photo_tags to service_role;
alter table public.photo_tags enable row level security;

create or replace function public.photo_event_id(_photo_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select event_id from public.photos where id = _photo_id
$$;

create policy "tags read by event members" on public.photo_tags for select to authenticated
  using (public.is_event_member(public.photo_event_id(photo_id), auth.uid()));
create policy "tags insert by event member, self as tagger, tagged is member" on public.photo_tags for insert to authenticated
  with check (
    tagger_id = auth.uid()
    and public.is_event_member(public.photo_event_id(photo_id), auth.uid())
    and public.is_event_member(public.photo_event_id(photo_id), tagged_user_id)
  );
create policy "tags delete by tagger or tagged" on public.photo_tags for delete to authenticated
  using (tagger_id = auth.uid() or tagged_user_id = auth.uid());

-- Invites
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  scope text not null check (scope in ('network','event')),
  event_id uuid references public.events(id) on delete cascade,
  max_uses int,
  used_count int not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.invites to authenticated;
grant all on public.invites to service_role;
alter table public.invites enable row level security;

create policy "invites read by inviter" on public.invites for select to authenticated
  using (inviter_id = auth.uid());
create policy "invites insert by self" on public.invites for insert to authenticated
  with check (inviter_id = auth.uid() and (scope = 'network' or public.is_event_owner(event_id, auth.uid())));
create policy "invites update by inviter" on public.invites for update to authenticated
  using (inviter_id = auth.uid()) with check (inviter_id = auth.uid());
create policy "invites delete by inviter" on public.invites for delete to authenticated
  using (inviter_id = auth.uid());

-- Invite redemptions (server function writes)
create table public.invite_redemptions (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.invites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  unique (invite_id, user_id)
);
grant select on public.invite_redemptions to authenticated;
grant all on public.invite_redemptions to service_role;
alter table public.invite_redemptions enable row level security;
create policy "redemptions read own or inviter" on public.invite_redemptions for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.invites i where i.id = invite_id and i.inviter_id = auth.uid()));

-- Friendships (symmetric, stored once with user_a < user_b)
create table public.friendships (
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);
grant select, delete on public.friendships to authenticated;
grant all on public.friendships to service_role;
alter table public.friendships enable row level security;
create policy "friendships read own" on public.friendships for select to authenticated
  using (auth.uid() in (user_a, user_b));
create policy "friendships delete own" on public.friendships for delete to authenticated
  using (auth.uid() in (user_a, user_b));
