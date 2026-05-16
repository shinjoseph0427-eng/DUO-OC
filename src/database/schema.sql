-- meet oc. — Database Schema
-- Phase 13: Updated — auth.users FK on public.users + updated_at triggers.
-- DO NOT run automatically. Apply manually via Supabase Dashboard → SQL Editor.
-- Review all policies and constraints before applying.

-- ─────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "citext";     -- case-insensitive email/handle comparisons

-- ─────────────────────────────────────────────
-- UPDATED_AT TRIGGER HELPER
-- Call set_updated_at() on any table that has an updated_at column.
-- ─────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ─────────────────────────────────────────────
-- USERS
-- Public app profile. id = auth.uid() — references auth.users(id) 1:1.
-- Do NOT store passwords here. Auth is handled by Supabase Auth (auth.users).
-- ─────────────────────────────────────────────

create table public.users (
  id                   uuid          primary key references auth.users(id) on delete cascade,
  email                citext        unique,
  phone                text          unique,
  first_name           text          not null,
  age                  integer       not null check (age >= 18 and age <= 25),
  gender               text,
  interested_in        text[]        default '{}',
  city                 text          not null,
  school               text,
  bio                  text          check (char_length(bio) <= 120),
  instagram_handle     text          unique,
  profile_photo_url    text,
  -- none → phone_verified → school_verified → selfie_verified → trusted
  verification_level   text          not null default 'none'
                                     check (verification_level in ('none','phone_verified','school_verified','selfie_verified','trusted')),
  is_active            boolean       not null default true,
  created_at           timestamptz   not null default now(),
  updated_at           timestamptz   not null default now()
);

create trigger users_updated_at
  before update on public.users
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- PROFILES
-- Extended preferences per user. Separated from users to keep public profile light.
-- ─────────────────────────────────────────────

create table public.profiles (
  id                        uuid          primary key default gen_random_uuid(),
  user_id                   uuid          not null unique references public.users(id) on delete cascade,
  vibes                     text[]        not null default '{}',
  intent                    text[]        not null default '{}',
  looking_for               text[]        not null default '{}',
  preferred_age_min         integer       not null default 18 check (preferred_age_min >= 18),
  preferred_age_max         integer       not null default 25 check (preferred_age_max <= 25),
  preferred_distance_miles  integer       not null default 30,
  preferred_cities          text[]        not null default '{}',
  availability              text[]        not null default '{}',
  -- safety_status: managed by admin only. clear → warned → suspended
  safety_status             text          not null default 'clear'
                                          check (safety_status in ('clear','warned','suspended')),
  created_at                timestamptz   not null default now(),
  updated_at                timestamptz   not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- DUOS
-- The core product unit. Two users who match together.
-- ─────────────────────────────────────────────

create table public.duos (
  id                      uuid          primary key default gen_random_uuid(),
  name                    text          not null,
  creator_user_id         uuid          not null references public.users(id),
  partner_user_id         uuid          references public.users(id),           -- null until partner joins
  partner_invite_contact  text,                                                -- phone or email of pending invite
  status                  text          not null default 'pending'
                                        check (status in ('pending','active','paused','archived')),
  bio                     text          check (char_length(bio) <= 120),
  shared_vibes            text[]        not null default '{}',
  looking_for             text[]        not null default '{}',
  preferred_spots         text[]        not null default '{}',
  card_photo_url          text,
  created_at              timestamptz   not null default now(),
  updated_at              timestamptz   not null default now()
);

create trigger duos_updated_at
  before update on public.duos
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- DUO_MEMBERS
-- Join table: which users belong to which duo.
-- ─────────────────────────────────────────────

create table public.duo_members (
  id          uuid          primary key default gen_random_uuid(),
  duo_id      uuid          not null references public.duos(id) on delete cascade,
  user_id     uuid          not null references public.users(id) on delete cascade,
  role        text          not null check (role in ('creator','partner')),
  status      text          not null default 'active' check (status in ('active','left','invited','removed')),
  created_at  timestamptz   not null default now(),
  unique (duo_id, user_id)
);

-- ─────────────────────────────────────────────
-- MATCH_REQUESTS
-- A duo requests a 2v2 hangout with another duo.
-- ─────────────────────────────────────────────

create table public.match_requests (
  id              uuid          primary key default gen_random_uuid(),
  from_duo_id     uuid          not null references public.duos(id),
  to_duo_id       uuid          not null references public.duos(id),
  check (from_duo_id <> to_duo_id),
  vibe            text          not null,
  preferred_time  text          not null,
  message         text          default '',
  status          text          not null default 'pending'
                                check (status in ('pending','accepted','rejected','expired','cancelled')),
  created_at      timestamptz   not null default now(),
  responded_at    timestamptz
);

-- Prevent duplicate pending requests from the same pair of duos
create unique index match_requests_no_duplicate_pending
  on public.match_requests (from_duo_id, to_duo_id)
  where status = 'pending';

-- ─────────────────────────────────────────────
-- MATCHES
-- Created when a match_request is accepted.
-- ─────────────────────────────────────────────

create table public.matches (
  id          uuid          primary key default gen_random_uuid(),
  duo_a_id    uuid          not null references public.duos(id),
  duo_b_id    uuid          not null references public.duos(id),
  request_id  uuid          not null unique references public.match_requests(id),
  status      text          not null default 'active'
                            check (status in ('active','archived','blocked')),
  matched_at  timestamptz   not null default now(),
  created_at  timestamptz   not null default now()
);

create trigger matches_updated_at
  before update on public.matches
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- HANGOUT_PLANS
-- Scheduling the actual IRL meetup after match.
-- SAFETY NOTE: public_place_only defaults to true.
-- ─────────────────────────────────────────────

create table public.hangout_plans (
  id                     uuid          primary key default gen_random_uuid(),
  match_id               uuid          not null unique references public.matches(id) on delete cascade,
  place_name             text,
  -- place_address stores a general area description only (e.g. "Irvine Spectrum, Irvine CA").
  -- Never store a private residential address here.
  place_address          text,
  city                   text,
  scheduled_time         timestamptz,
  vibe                   text,
  -- public_place_only: enforced true for all first hangouts. Do not add private locations in MVP.
  public_place_only      boolean       not null default true,
  confirmed_by_user_ids  uuid[]        not null default '{}',
  status                 text          not null default 'planning'
                                       check (status in ('planning','confirmed','done','cancelled')),
  created_at             timestamptz   not null default now(),
  updated_at             timestamptz   not null default now()
);

create trigger hangout_plans_updated_at
  before update on public.hangout_plans
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- CHAT_THREADS
-- One thread per match. Created when match is accepted.
-- No pre-match DMs.
-- ─────────────────────────────────────────────

create table public.chat_threads (
  id          uuid          primary key default gen_random_uuid(),
  match_id    uuid          not null unique references public.matches(id) on delete cascade,
  created_at  timestamptz   not null default now(),
  updated_at  timestamptz   not null default now()
);

-- ─────────────────────────────────────────────
-- CHAT_MESSAGES
-- Messages within a chat thread.
-- Never delete messages — archive or flag instead.
-- ─────────────────────────────────────────────

create table public.chat_messages (
  id               uuid          primary key default gen_random_uuid(),
  thread_id        uuid          not null references public.chat_threads(id) on delete cascade,
  sender_user_id   uuid          not null references public.users(id),
  body             text          not null check (char_length(body) > 0 and char_length(body) <= 2000),
  is_read          boolean       not null default false,
  created_at       timestamptz   not null default now()
);

create index chat_messages_thread_id_idx on public.chat_messages (thread_id);
create index chat_messages_created_at_idx on public.chat_messages (created_at);

-- ─────────────────────────────────────────────
-- BLOCKS
-- User-to-user blocks. Discovery queries must check both directions.
-- ─────────────────────────────────────────────

create table public.blocks (
  id                uuid          primary key default gen_random_uuid(),
  blocker_user_id   uuid          not null references public.users(id),
  blocked_user_id   uuid          not null references public.users(id),
  check (blocker_user_id <> blocked_user_id),
  reason            text,
  created_at        timestamptz   not null default now(),
  unique (blocker_user_id, blocked_user_id)
);

-- ─────────────────────────────────────────────
-- REPORTS
-- Insert-only for regular users. Admin can update status.
-- Messages in reported threads are NEVER deleted — preserved for review.
-- ─────────────────────────────────────────────

create table public.reports (
  id                    uuid          primary key default gen_random_uuid(),
  reporter_user_id      uuid          not null references public.users(id),
  reported_user_id      uuid          references public.users(id),
  reported_duo_id       uuid          references public.duos(id),
  reported_match_id     uuid          references public.matches(id),
  reason                text          not null
                                      check (reason in ('harassment','spam','underage','fake','inappropriate','other')),
  details               text,
  status                text          not null default 'open'
                                      check (status in ('open','reviewing','resolved','dismissed')),
  created_at            timestamptz   not null default now(),
  reviewed_at           timestamptz,
  constraint report_has_target check (
    reported_user_id is not null or
    reported_duo_id  is not null or
    reported_match_id is not null
  )
);

-- ─────────────────────────────────────────────
-- VERIFICATIONS
-- Phone / school email / selfie verification records per user.
-- ─────────────────────────────────────────────

create table public.verifications (
  id           uuid          primary key default gen_random_uuid(),
  user_id      uuid          not null references public.users(id) on delete cascade,
  type         text          not null check (type in ('phone','school','selfie','id')),
  status       text          not null default 'pending'
                             check (status in ('pending','verified','failed','expired')),
  provider     text,         -- e.g. 'twilio', 'manual', 'persona'
  created_at   timestamptz   not null default now(),
  verified_at  timestamptz
);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- Enabled on all tables. Phase 13 policies are in rls_policies_phase13.sql.
-- With RLS enabled and no policies: no rows are accessible to any client.
-- This is safe — apply policies before inserting real user data.
-- ─────────────────────────────────────────────

alter table public.users          enable row level security;
alter table public.profiles       enable row level security;
alter table public.duos           enable row level security;
alter table public.duo_members    enable row level security;
alter table public.match_requests enable row level security;
alter table public.matches        enable row level security;
alter table public.hangout_plans  enable row level security;
alter table public.chat_threads   enable row level security;
alter table public.chat_messages  enable row level security;
alter table public.blocks         enable row level security;
alter table public.reports        enable row level security;
alter table public.verifications  enable row level security;

-- ─────────────────────────────────────────────
-- RLS POLICY STUBS (Phase 14+ — implement per table before connecting real users)
-- Phase 13 policies for users + profiles are in rls_policies_phase13.sql.
-- ─────────────────────────────────────────────

-- TODO: public.duos
--   POLICY: users can read active duos (status = 'active')
--   POLICY: users can create a duo only if creator_user_id = auth.uid()
--   POLICY: users can update only duos they created (auth.uid() = creator_user_id)

-- TODO: public.duo_members
--   POLICY: users can read memberships of active duos
--   POLICY: users can only insert their own membership row

-- TODO: public.match_requests
--   POLICY: users can send a request only from their own duo
--   POLICY: users can read requests only for their own duo (from or to)
--   POLICY: users can update status only on requests sent to their duo

-- TODO: public.matches
--   POLICY: users can read a match only if member of either duo_a or duo_b
--   POLICY: no direct insert — created by acceptMatchRequest / DB trigger

-- TODO: public.hangout_plans
--   POLICY: users can read/write only for their own match's duos
--   POLICY: public_place_only cannot be set to false in MVP

-- TODO: public.chat_threads / public.chat_messages
--   POLICY: access only if member of one of the matched duos
--   POLICY: users can insert only their own messages
--   POLICY: no UPDATE/DELETE on messages

-- TODO: public.blocks
--   POLICY: users can insert as themselves only
--   POLICY: users can read only their own block list
--   POLICY: discovery queries must exclude blocked users in both directions

-- TODO: public.reports
--   POLICY: users can insert (reporter = auth.uid())
--   POLICY: users cannot read other users' reports
--   POLICY: admin role can read/update all reports

-- TODO: public.verifications
--   POLICY: users can read only their own verification records
--   POLICY: only service_role can insert/update verification status
