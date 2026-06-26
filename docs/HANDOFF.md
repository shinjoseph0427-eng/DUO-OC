# WEEKLY — Engineering Handoff

_Last updated: 2026-06-21. Covers the foundation-hardening + feature work done in
this work stream. Written for a developer picking up the repo._

## TL;DR

- The app's **core loop works**: auth → onboarding → weekly card → explore →
  request → match → realtime chat → plan propose/confirm → +1 guest.
- This work stream did **4 things**: (1) made the DB reproducible from
  migrations, (2) fixed two P0 chat bugs, (3) relaxed the age gate to 18+, (4)
  added chat-leave notifications and Google-Places venue suggestions in PLAN.
- **Shipped:** all code is committed and pushed to `main` (commit `dd03a72`),
  Vercel auto-deploys the frontend. All 8 migrations are applied to production.
- **Still TODO (manual, needs Supabase CLI):** deploy the two Edge Functions
  (`suggest-venues`, `send-push-notification`) and set the Google Places key.

## Stack (unchanged)

React 18 + Vite (plain JS, no TS) · Supabase (Postgres/Auth/Realtime/Storage/
Edge Functions) · Firebase Cloud Messaging (push) · framer-motion · Vercel
(auto-deploy from `main`). Custom `go()`/`useState` routing in `src/App.jsx`
(no router lib). Design tokens in `src/tokens.js` (light theme; `C.white` =
near-black text — see note in that file).

---

## 1. Foundation — reproducible DB

**Problem found:** production had columns/tables the app uses that **no migration
created** (hand-added in the SQL editor). A fresh DB could not be built from
migrations — several historical migrations referenced `notifications` /
`homie_requests` / `profiles` columns unguarded and would fail.

**Fix:** an **early** reconciliation migration (timestamped right after
`initial_schema`) creates the missing objects so the whole chain applies.

- `supabase/migrations/20260516000001_reconcile_core_schema.sql`
  - `profiles` add-columns: `birth_year, lat, lng, photos, bio, username,
    onboarding_complete, prompt_q1/a1/q2/a2` (+ defensively `is_solo, fcm_token,
    deleted_at`).
  - creates `notifications` (id, user_id, type, payload jsonb, read, created_at,
    expires_at) + RLS + indexes.
  - creates `homie_requests` as **legacy-compat only** (not used by WEEKLY; exists
    so legacy migrations apply and fresh = prod).
- `supabase/migrations/20260620000000_add_missing_indexes.sql` — FK indexes on
  `solo_requests(to/from_user_id)`, `solo_matches(user_a/user_b)` + re-asserts
  `solo_matches_active_pair_uniq` (one active match per pair).
- `src/database/README.md` — marks `src/database/*` (old "meet oc." schema) as
  **legacy / non-authoritative**. The real schema = `supabase/migrations/*`.
- `supabase/diagnostics/schema_audit.sql` — read-only queries to diff prod schema
  vs migrations.

**Reproducibility note:** because `20260516000001` is timestamped before
already-applied migrations, `supabase db push` flags it out-of-order. On the
existing prod DB it's all idempotent no-ops, so mark it applied instead of
re-running:
```bash
supabase migration repair --status applied 20260516000001
```
A brand-new DB just runs `supabase db reset` and applies everything in order.
(Could not be executed/verified here — no Docker/CLI in the work env; traced by
hand. Verify with `supabase start && supabase db reset` on a Docker machine.)

## 2. P0 chat fixes

- **Inbox ordering** — `SoloInboxPage` now sorts by latest message time (fallback
  `matched_at`); was sorting by `matched_at` only.
- **Real unread badge** — new table `solo_match_reads (match_id, user_id,
  last_read_at)`:
  - `supabase/migrations/20260620000001_solo_match_reads.sql`
  - `src/lib/soloMessages.js`: `markSoloMatchRead`, `getSoloMatchReads`,
    `getSoloUnreadCounts`, `getTotalSoloUnread`.
  - Opening a chat marks it read; inbox shows per-chat unread counts; the
    Messages tab badge (`App.jsx`) now reflects true unread messages.
  - **Known gap:** the tab badge updates on load / notification events, not in
    real time for a message arriving while you're outside the inbox (would need a
    global `solo_messages` subscription).

## 3. Age gate → 18+ (no upper cap)

- `supabase/migrations/20260620000002_relax_profiles_age_constraints.sql`
  - drops `profiles_age_check` (was on the dead `age` column — app uses
    `birth_year` as source of truth; `age` column kept to avoid data loss,
    deprecated).
  - replaces `age_range` with **18+ only**, no maximum.
- `OnboardingFlow.jsx` validation `n < 18` (removed `> 25`); placeholder/label →
  "18+"; `WeeklyExplorePage` header → "OC · 18+".

## 4. Chat "Leave" → notify the other person

- `supabase/migrations/20260621000000_add_solo_left_notification.sql` — adds
  `solo_left` to `notifications_type_check` (all existing types preserved).
- `supabase/migrations/20260621000001_solo_leave_system_messages.sql`:
  - `solo_messages.is_system` (bool) + `sender_user_id` made nullable (system
    messages have no author).
  - `solo_matches.ended_at`.
  - `leave_solo_match(p_match_id)` RPC (SECURITY DEFINER): ends match + posts
    "X left the chat" system message + creates `solo_left` notification; returns
    `notification_id` for push.
- Client: `src/lib/solo.js` `leaveSoloMatch` (replaces direct-UPDATE
  `endSoloMatch`); `getMySoloMatches({ includeEnded })` (default active-only, so
  Home/badges unchanged; inbox passes `true`).
- `SoloChatPage`: confirm copy "The other person will be notified"; system
  messages render centered grey italic; **ended state** = input disabled +
  "This conversation has ended" banner, PLAN controls hidden (confirmed plan kept
  as history), Leave button hidden.
- `SoloInboxPage`: ended matches stay as greyed "Ended" history, excluded from
  unread.
- `NotificationBell` + `App.jsx`: `solo_left` label + tab badge.
- `send-push-notification` edge function: `solo_left` → title "Chat ended", body
  "[name] has left the chat".

## 5. PLAN venue suggestions (Google Places New, business-only)

- `supabase/migrations/20260621000002_venue_search_cache.sql` — `venue_search_cache`
  (RLS-locked, service-role only) + `cleanup_venue_cache()` + `solo_plans`
  `place_type` / `google_place_id`.
- `supabase/migrations/20260621000003_propose_solo_plan_venue.sql` — extends
  `propose_solo_plan` RPC with `p_place_type` / `p_google_place_id` (DROP+recreate;
  all existing logic preserved). Needed because `solo_plans` has no UPDATE RLS —
  the RPC is the only write path.
- `supabase/functions/suggest-venues/index.ts` — auth-required Edge Function:
  cache → Google Places **Text Search (New)** → **business-only filter** →
  normalize → cap 8 → cache. Cost guards: 24h cache, 1h negative cache, per-user
  10/min rate limit, results capped.
  - **Business-only filter (hard guard):** `businessStatus=OPERATIONAL`, ≥1
    allowed type AND no blocked type (blocks lodging / schools / medical /
    worship / address-and-locality types), `userRatingCount>=20`, `rating>=4.0`,
    address must contain an allowed OC city.
  - **API key is server-side only** (`GOOGLE_PLACES_API_KEY` in Supabase
    secrets). No key → returns `[]` (app never breaks).
  - **`photo_url` is null by design** — Google photo media URLs embed the API
    key; surfacing them would leak it. A proxied photo endpoint is a possible
    follow-up.
- `src/lib/venueSuggest.js` — `suggestVenues`, debounced variant,
  `CATEGORY_EMOJI`, `categoryEmojiPrefix`.
- `SoloChatPage` PLAN form: "Suggested spots" horizontal cards (skeleton loading,
  hover highlight); tap fills `"Name, City"` + stores `place_type` /
  `google_place_id`; manual edit clears the picked venue. Category emoji on the
  proposed/confirmed plan.
- `HomePage`: confirmed-plan card shows category emoji (`place_type==='other'` →
  none).
- `docs/GOOGLE_PLACES_SETUP.md` — full GCP/key/secrets/deploy walkthrough.

---

## Deploy status & remaining manual steps

| Item | Status |
|---|---|
| 8 migrations | ✅ applied to production (confirmed by owner) |
| Frontend code | ✅ committed + pushed to `main` (`dd03a72`) → Vercel deploying |
| Edge fn `suggest-venues` | ⏳ **needs deploy** + `GOOGLE_PLACES_API_KEY` secret |
| Edge fn `send-push-notification` | ⏳ **needs redeploy** (for `solo_left` push) |

```bash
supabase secrets set GOOGLE_PLACES_API_KEY=YOUR_KEY
supabase functions deploy suggest-venues
supabase functions deploy send-push-notification
```
Not deploying these does **not** break the app — only push-on-leave and venue
suggestions stay inactive (graceful degradation).

## Build / lint

`npm run build` → 0 errors (one pre-existing ~600 KB chunk-size warning).
`npm run lint` → 0 errors, 6 pre-existing unused-var warnings (none from this
work).

## Known limitations / risks (not bugs)

1. Unread **tab** badge isn't real-time for messages arriving while outside the
   inbox (per-chat counts and inbox are correct).
2. Venue **photos** are disabled to avoid API-key leakage (see §5).
3. Venue **rate limit** is in-memory/best-effort; the durable cost guard is the
   24h cache table.
4. `homie_requests` was recreated as legacy-compat; full legacy-DUO cleanup is
   deferred to post-PMF.
5. `age` column is deprecated but retained (data safety); remove post-PMF.
6. One-time recommended check: diff prod column **types** against the migration
   files using `supabase/diagnostics/schema_audit.sql` (ADD COLUMN IF NOT EXISTS
   never alters an existing column, so a pre-existing prod type could differ from
   a fresh DB's).

## Suggested next steps

1. Deploy the two Edge Functions + set the Places key.
2. Smoke-test on live: leave-notification, inbox ordering + unread, 18+ signup,
   PLAN venue picker.
3. Post-PMF cleanup: dead components/lib functions, legacy DUO tables, `age`
   column, duplicate indexes (see the original audit report).
