-- ============================================================================
-- SCHEMA RECONCILIATION (early, idempotent, additive only)
-- ----------------------------------------------------------------------------
-- Why this file exists, and why its timestamp is RIGHT AFTER initial_schema:
--
-- The production database was hand-edited in the Supabase SQL editor, so a
-- number of columns/tables the app depends on were never created by a
-- migration. Several LATER migrations then reference those objects *without*
-- guards, e.g.:
--   * 20260531000004_fix_notifications_rls  -> CREATE POLICY ... ON notifications
--   * 20260531000008_homie_unique_pair      -> DELETE/CREATE INDEX ON homie_requests
--   * 20260531000009_profiles_cascade       -> ALTER TABLE notifications/homie_requests
--   * 20260531000010_enable_realtime        -> ALTER PUBLICATION ... ADD notifications
--   * 20260531000012_add_expiry_system      -> ALTER TABLE notifications/homie_requests
--   * 20260610000001_browse_weekly_profiles -> LANGUAGE sql fn reads profiles.birth_year etc.
--                                              (SQL function bodies are validated at CREATE)
-- On a FRESH database those migrations fail, so the repo is not reproducible.
--
-- This migration creates the missing objects up front so the rest of the
-- existing migration chain applies cleanly and the app runs against a fresh DB.
-- It is 100% additive (ADD COLUMN / CREATE TABLE / CREATE INDEX IF NOT EXISTS),
-- so on the existing production database every statement is a safe no-op.
--
-- NOTE ON APPLYING TO PRODUCTION: because this file's version is older than
-- migrations already applied in prod, `supabase db push` may flag it as
-- out-of-order. Since prod already contains every object below, the safest path
-- is to mark it as already applied rather than re-run it:
--     supabase migration repair --status applied 20260516000001
-- (A fresh project instead just runs `supabase db reset` / push normally.)
-- ============================================================================

-- ── A. profiles: columns the app reads/writes but no migration created ──────
-- Types chosen from current code usage:
--   birth_year  int   (OnboardingFlow: getFullYear() - age)
--   lat / lng   float8 (haversine math in find_weekly_matches / solo.js)
--   photos      text[] (array of public storage URLs)
--   username    text   (lowercased in app; uniqueness enforced in app layer)
--   onboarding_complete boolean (isProfileOnboardingComplete / gate in App.jsx)
--   prompt_q1/a1/q2/a2 text (EditProfile)
-- These coexist with the legacy initial_schema columns (id, name, age, city,
-- instagram, created_at) and the additive columns from other migrations
-- (is_solo, fcm_token, deleted_at) which are repeated here defensively.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_solo             boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fcm_token           text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at          timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_year          integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lat                 double precision;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lng                 double precision;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS photos              text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio                 text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username            text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS prompt_q1           text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS prompt_a1           text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS prompt_q2           text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS prompt_a2           text;

-- Case-insensitive uniqueness for username is enforced in the app (checkUsername).
-- A DB-level unique index is intentionally NOT added here: if production already
-- holds duplicate/NULL usernames the CREATE would fail. See README / "remaining
-- risks" for the optional follow-up.

-- ── B. notifications: used throughout the app, created by no migration ───────
-- Fields per current usage (notifications.js, NotificationBell, all notify_* RPCs,
-- add_expiry_system). expires_at keeps the 30-day default the expiry job relies on.
CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       text NOT NULL,
  payload    jsonb NOT NULL DEFAULT '{}'::jsonb,
  read       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days')
);

-- Indexes for the two hot read paths (unread badge + recent list).
CREATE INDEX IF NOT EXISTS notifications_user_read_idx    ON public.notifications (user_id, read);
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON public.notifications (user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies use the SAME names the later notifications migrations expect, so those
-- migrations (ctrack guarded-create, fix_notifications_rls) remain no-ops / keep
-- ownership of the final INSERT policy. DROP IF EXISTS keeps this re-runnable.
DROP POLICY IF EXISTS "users read own notifications" ON public.notifications;
CREATE POLICY "users read own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users update own notifications" ON public.notifications;
CREATE POLICY "users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- INSERT is intentionally permissive: notify_* RPCs (SECURITY DEFINER) and
-- client flows create rows for OTHER users. 20260531000004_fix_notifications_rls
-- later replaces this with its canonical "authenticated users can insert
-- notifications" policy; both are WITH CHECK (true).
DROP POLICY IF EXISTS "authenticated users insert notifications" ON public.notifications;
CREATE POLICY "authenticated users insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- ── C. homie_requests: LEGACY (homie -> duo flow), created by no migration ──
-- This table is NOT part of the WEEKLY core loop. It is recreated here purely so
-- the historical legacy migrations that reference it unguarded
-- (homie_unique_pair, profiles_cascade, add_expiry_system, ctrack policies,
-- ltrack RPCs) apply cleanly on a fresh database and the fresh schema matches
-- production. Columns are the minimal set those migrations + the push edge
-- function require. Do not build new features on this table.
CREATE TABLE IF NOT EXISTS public.homie_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'pending',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.homie_requests ENABLE ROW LEVEL SECURITY;
-- Policies for this legacy table are created by 20260523000000_ctrack (guarded),
-- which now finds the table present and applies them. Nothing else needed here.
