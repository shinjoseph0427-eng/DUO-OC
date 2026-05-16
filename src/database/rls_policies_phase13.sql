-- meet oc. — RLS Policies: Phase 13
-- Scope: public.users and public.profiles only.
-- DO NOT run automatically. Apply manually via Supabase Dashboard → SQL Editor
-- AFTER running schema.sql and BEFORE inserting real user data.
--
-- Future phases will add policies for:
--   duos, duo_members, match_requests, matches, hangout_plans,
--   chat_threads, chat_messages, blocks, reports, verifications
--
-- IMPORTANT NOTES:
-- - Sensitive fields (phone, email, verification_level) should be hidden from broad reads
--   via column-level security or a separate public view in a future phase.
-- - chat_messages and reports require the strictest RLS — implement before Phase 14 chat wiring.
-- - All policies use auth.uid() which returns the UUID of the currently authenticated user.

-- ─────────────────────────────────────────────
-- ENABLE RLS (idempotent — safe to run even if already enabled in schema.sql)
-- ─────────────────────────────────────────────

alter table public.users    enable row level security;
alter table public.profiles enable row level security;

-- ─────────────────────────────────────────────
-- public.users POLICIES
-- ─────────────────────────────────────────────

-- 1. Authenticated users can read public profile fields of any active user.
--    NOTE: This exposes the full row for now. In a future phase, replace with a
--    restricted view that excludes phone, email, and verification_level.
create policy "users: authenticated can read active profiles"
  on public.users
  for select
  to authenticated
  using (is_active = true);

-- 2. A user can insert only their own row on sign-up.
--    auth.uid() must match the id being inserted.
create policy "users: insert own row"
  on public.users
  for insert
  to authenticated
  with check (auth.uid() = id);

-- 3. A user can update only their own row.
create policy "users: update own row"
  on public.users
  for update
  to authenticated
  using  (auth.uid() = id)
  with check (auth.uid() = id);

-- ─────────────────────────────────────────────
-- public.profiles POLICIES
-- ─────────────────────────────────────────────

-- 1. Authenticated users can read any profile.
--    Vibes and intent are non-sensitive for discovery purposes.
--    NOTE: preferred_cities and availability are also readable here.
--    If intent privacy becomes a concern, move to a restricted view.
create policy "profiles: authenticated can read all"
  on public.profiles
  for select
  to authenticated
  using (true);

-- 2. A user can insert only their own profile row.
create policy "profiles: insert own row"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- 3. A user can update only their own profile.
create policy "profiles: update own row"
  on public.profiles
  for update
  to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
