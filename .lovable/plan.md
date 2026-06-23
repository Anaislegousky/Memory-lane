# Memories — MVP Plan

A mobile-first PWA-style web app to share event photos privately with friends. Built on Lovable Cloud (EU-hosted Postgres + Storage + Auth), OpenStreetMap via Leaflet, and TanStack Start.

## 1. Design direction

- Mobile-first, single-column layouts, large tap targets, bottom tab bar nav (Events / Map / Profile).
- Warm, photo-forward aesthetic — soft off-white background, deep ink text, one warm accent (terracotta/amber). Rounded cards, generous whitespace, subtle shadows so photos pop.
- Typography: a friendly humanist sans (e.g. Figtree) for UI, a slightly editorial display face for event titles.
- Smooth micro-interactions on photo upload, event creation, and tag chips.

## 2. Backend (Lovable Cloud, EU region)

Tables (all with RLS):
- `profiles` — id (auth.users fk), display_name, created_at.
- `events` — id, owner_id, name, event_date, location_label, lat, lng, created_at.
- `event_members` — event_id, user_id, role (owner/member), joined_at. Controls who can view/upload.
- `photos` — id, event_id, uploader_id, storage_path, width, height, taken_at, created_at, expires_at (created_at + 90d).
- `photo_tags` — photo_id, tagged_user_id, tagger_id, x, y (optional position).
- `invites` — id, token (unique), inviter_id, scope ('network' | 'event'), event_id (nullable), max_uses (nullable), used_count, expires_at.
- `invite_redemptions` — invite_id, user_id, redeemed_at.
- `user_roles` + `has_role()` security-definer fn (per platform convention; admin role for future moderation).

Storage:
- Private bucket `event-photos`, path `event_id/photo_id.ext`. Signed URLs for display.
- Scheduled cleanup (pg_cron + edge function `cleanup-photos`) runs daily, deletes photos where `expires_at < now()` from storage + table.

Account deletion:
- Server function `delete-my-account` cascades: removes photos from storage, deletes rows the user owns, then `auth.admin.deleteUser`.

RLS summary:
- `events` / `photos`: SELECT allowed when user is in `event_members` for that event. INSERT photos: members only.
- `event_members`: a user can insert themselves only via a valid invite redemption (handled by a server function that validates the token, then inserts).
- `profiles`: user reads any profile (needed for tagging); updates only own.

## 3. Invite system (shareable links)

Two link types, both generated from the app:
1. **Network invite** — `/join/:token` — onboards a new user. After signup they're auto-added to the inviter's "friends" (a row in `friendships`) and shown the inviter's events they're a member of.
2. **Event invite** — `/join/:token` with scope='event' — same flow, additionally inserts into `event_members` for that event.

Tokens are random 16-byte url-safe strings; optional expiry and max-uses. Server function `redeem-invite` validates and performs the joins atomically. If the visitor isn't signed in, route shows signup/login first, then redeems.

(Add `friendships(user_a, user_b)` table so users can see each other's future events they're invited to.)

## 4. Routes (TanStack Start, file-based)

Public:
- `/` — landing + login/signup CTA.
- `/auth` — email+password signup/login (Lovable Cloud auth). Display name captured on signup.
- `/join/$token` — invite redemption.
- `/privacy` — GDPR privacy policy page.
- `/legal/cookies` — cookie info.

Authenticated (`_authenticated/`):
- `/events` — list of events the user belongs to (cards with cover photo, date, location).
- `/events/new` — create event: name, date picker, location (geolocation button → reverse-geocode via Nominatim, or manual address/city input with Nominatim search).
- `/events/$id` — event detail: header, photo gallery grid, upload button, member list, tag interactions, share-invite button.
- `/map` — full-screen Leaflet map with markers for all events the user belongs to; tap marker → event sheet.
- `/profile` — display name, email, manage invites, export my data (JSON), delete account, logout.

## 5. Photos & tagging

- Upload via `<input type="file" multiple accept="image/*">` (camera capture on mobile). Client-side compression (browser-image-compression) before upload to keep storage usage sane.
- Gallery: responsive grid, tap to open lightbox. In lightbox, "Tag people" opens a sheet listing event members; selecting one adds a tag chip. Optionally tap a spot on the photo to position the tag.
- Tagging restricted to registered users who are members of the event.

## 6. Map

- Leaflet + react-leaflet, OpenStreetMap tiles (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`) with attribution.
- Geocoding/reverse-geocoding via Nominatim (`https://nominatim.openstreetmap.org`) called from a server function to respect their usage policy (User-Agent header + caching).
- Geolocation uses browser `navigator.geolocation`; users can always switch to manual address input.

## 7. GDPR / privacy

- Cookie consent banner on first visit, stored in localStorage. Categories: Essential (always on), Analytics (disabled in V1).
- Privacy page: purpose of data, EU storage, 90-day photo retention, user rights (access/export/delete), contact email placeholder for DPO requests.
- "Export my data" button generates a JSON of profile + events + photo metadata.
- "Delete my account" with confirm modal triggers the cascading server function.
- No third-party analytics, no tracking scripts.

## 8. Stack & libraries to add

- `leaflet`, `react-leaflet`, `@types/leaflet`
- `browser-image-compression`
- `date-fns`
- `@fontsource/figtree` (UI), `@fontsource/fraunces` (display)
- shadcn/ui components (already available)

## Technical notes

- All photo reads use short-lived signed URLs from Storage.
- pg_cron schedules `cleanup-photos` daily at 03:00 UTC.
- Server functions for: redeem-invite, create-invite, geocode, reverse-geocode, export-my-data, delete-my-account, cleanup-photos.
- Map and gallery are client-only components (`ssr: false` where needed) since Leaflet needs `window`.
- Image uploads go directly to Storage from the browser using the user's session (RLS on storage policies restricts path to events the user is a member of).

## Out of scope for V1

- Push notifications, comments/reactions, video, face recognition, multi-language, native apps, Amplitude/analytics.

## Build order

1. Enable Lovable Cloud, create schema + RLS + storage bucket + cron.
2. Auth (signup/login, profile capture) + cookie banner + privacy page.
3. Events CRUD + map view.
4. Photo upload + gallery + signed URLs + 90-day cleanup job.
5. Invite links (network + event) + join flow.
6. Tagging.
7. Profile: export data, delete account.
8. Polish, empty states, mobile QA.
