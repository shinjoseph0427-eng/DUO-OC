# meet oc. — Real Product Plan
> Practical build document for developers. Not a pitch deck.
> Last updated: 2026-05-12

---

## Table of Contents

1. [Product Definition](#1-product-definition)
2. [Core User Types](#2-core-user-types)
3. [Core User Flow](#3-core-user-flow)
4. [Required Backend Systems](#4-required-backend-systems)
5. [Database Schema Plan](#5-database-schema-plan)
6. [Matching Algorithm v1](#6-matching-algorithm-v1)
7. [Place and Time Planning System](#7-place-and-time-planning-system)
8. [Safety System](#8-safety-system)
9. [Verification System](#9-verification-system)
10. [Chat System](#10-chat-system)
11. [Viral Growth Loops](#11-viral-growth-loops)
12. [Monetization Plan](#12-monetization-plan)
13. [MVP Build Phases](#13-mvp-build-phases)
14. [Supabase Implementation Plan](#14-supabase-implementation-plan)
15. [Engineering Priorities](#15-engineering-priorities)
16. [Legal / Trust / Safety Notes](#16-legal--trust--safety-notes)
17. [Immediate Next Coding Tasks](#17-immediate-next-coding-tasks)

---

## 1. Product Definition

**meet oc.** is a 2v2 social dating / hangout app for 18–25 year olds in Orange County.

**Core sentence:**
> "Bring your friend. Match with another duo. Meet in public. No awkward 1:1."

### What it is NOT

| Not this | Why it matters |
|----------|---------------|
| A swipe-based dating app | Reduces pressure; changes behavior pattern |
| A random chat app | No unsolicited contact before mutual match |
| A hookup app | Explicitly social-first positioning |
| A nationwide app | OC-only density creates critical mass faster |
| A 1:1 dating app | Two people go together; safety and comfort built in |

### What it IS

1. Create a personal profile (name, age, city, school, vibes, Instagram)
2. Form a duo with a friend (invite them or go solo until they join)
3. Browse other active duos in OC
4. Send a 2v2 hangout request (vibe + time + message)
5. Match only when the other duo accepts — both sides must agree
6. Suggest a public place and time for the hangout
7. Instagram handles unlock only after mutual match
8. Chat inside the app after matching
9. Public meetups by default — safety is a core product feature, not an afterthought

---

## 2. Core User Types

### User
An individual 18–25 person in OC who has created a meet oc. account.
- Has a personal profile, vibes, school, city
- Belongs to 0 or 1 active duo at a time

### Duo
Two users who appear together as a social pair on the discovery feed.
- Has a shared profile: duo name, shared vibes, bio, OC spots
- Can send and receive 2v2 requests
- Becomes active only when both members have joined

### Pending Duo
A user has invited a friend but the friend has not signed up yet.
- Creator's profile is visible but duo is marked as "incomplete"
- Cannot send requests until partner joins
- Can receive requests (partner must join to accept)

### Verified User
A user who has completed one or more verification steps.
- Phone verified: confirmed real phone number
- School verified: confirmed .edu email
- Selfie verified: liveness check passed
- Verification level improves trust score in matching

### Matched Duo
Two duos that have mutually accepted a 2v2 request.
- Chat thread is created
- Instagram handles become visible
- Hangout planning flow becomes available

### Admin
Internal operator account.
- Can view reports, flag users, suspend accounts
- No privileged match access (does not see chat content except when reported)
- Accessed via separate admin dashboard (not the main app)

---

## 3. Core User Flow

### A. New user — onboarding
```
Landing
→ Sign up (email or phone)
→ Step 1: Personal info (name, age, city, school, Instagram)
→ Step 2: Vibes + intent
→ Step 3: Create duo (invite friend or "add later")
→ Step 4: Duo profile (name, bio, spots, looking for)
→ Profile live → Home feed
```

Age gate enforced at step 1. Under 18 → blocked. Over 25 → blocked for MVP.

### B. Duo creation
```
User creates profile
→ Invites friend via phone/link
→ Friend receives invite → signs up → duo becomes active
→ OR: user proceeds solo with "pending duo" status
```

A solo user with no partner can browse but cannot send requests until duo is active.
Decision: allow solo browsing to reduce drop-off during onboarding.

### C. Discovery
Home feed shows local duos ranked by matching score. Filters applied:

- City / OC area
- Distance (when GPS is available)
- Age range compatibility
- Vibe overlap
- Availability window
- Verification level
- Active within last 7 days (inactive duos deprioritized)

### D. Request
```
User taps duo card
→ Duo detail page
→ "Request 2v2"
→ Choose: vibe / when / optional message
→ Submit request (status: pending)
→ Other duo receives notification
```

### E. Match
```
Other duo taps "Accept"
→ match_requests.status → accepted
→ matches record created
→ chat_thread created
→ MatchScreen shown to both duos
→ Instagram handles unlocked
→ Hangout planning begins
```

If declined: request marked declined. No notification to requester beyond status update.

### F. Hangout planning
```
After match:
→ Both duos see hangout planning card in chat
→ Suggest place (from static OC list or freeform)
→ Propose time
→ Both duos confirm
→ Hangout marked confirmed
```

Instagram is unlocked immediately at match, but hangout planning keeps users in the app.

### G. Post-hangout
After a confirmed hangout date passes:
- Private feedback prompt (not public rating — avoid Yelp-like anxiety)
- Report unsafe behavior option
- Block option
- "Request again" option if positive experience
- Favorite duo (for later use)

---

## 4. Required Backend Systems

### Core systems (MVP)

| System | Purpose |
|--------|---------|
| Authentication | Sign up, sign in, session management |
| User profiles | Store personal info, vibes, Instagram handle |
| Photo storage | Profile photos, duo card photos |
| Duo creation & invitation | Create duo, invite partner, track status |
| Duo discovery | Fetch + rank duos by score, apply filters |
| Match requests | Send, accept, decline 2v2 requests |
| Match acceptance | Create match record, unlock Instagram, create chat |
| Chat | Thread per match, real-time messages |
| Notifications | Push/in-app for requests, matches, messages |
| Place/time planning | Suggest public spots, confirm hangout |
| Report & block | User safety actions |
| Verification badge | Track phone/school/selfie verification level |
| Admin moderation | Review reports, suspend accounts |

### Later systems (post-MVP)

| System | Purpose |
|--------|---------|
| Stripe | Boost, premium, paid features |
| Google Places API | Dynamic place search |
| Twilio | SMS verification |
| SendGrid / Resend | Email notifications |
| AI safety layer | Detect suspicious messages |

### Recommended stack

**Supabase** for everything in MVP.

Why Supabase over alternatives:

| Feature | Supabase | Firebase | PlanetScale + custom |
|---------|----------|----------|---------------------|
| Auth | Built-in | Built-in | DIY |
| Postgres SQL | Yes (full SQL) | No (NoSQL) | Yes |
| Row Level Security | Yes | Limited | DIY |
| Realtime | Yes | Yes | DIY |
| Storage | Yes | Yes | DIY |
| Cost (early stage) | Low / free tier | Low / free tier | Higher |
| SQL migrations | Yes | No | Yes |
| Open source | Yes | No | Partial |

Decision: Use Supabase. Full SQL means proper relational schema. RLS means security baked in. Free tier covers early growth.

**Vercel** for frontend deployment.

---

## 5. Database Schema Plan

> Do not implement SQL yet. Document schema and relationships only.

### users
```
id                   uuid        PK, default gen_random_uuid()
email                text        unique, not null
phone                text        nullable, unique
first_name           text        not null
age                  integer     not null, check (age >= 18 and age <= 25)
gender               text        nullable ('man','woman','nonbinary','other')
interested_in        text[]      nullable
city                 text        not null
school               text        nullable
bio                  text        nullable, max 120 chars
instagram_handle     text        nullable
profile_photo_url    text        nullable
verification_level   text        default 'none'
is_active            boolean     default true
created_at           timestamptz default now()
updated_at           timestamptz default now()
```

### profiles
```
id                      uuid        PK
user_id                 uuid        FK → users.id, unique
vibes                   text[]      default '{}'
intent                  text[]      default '{}'
looking_for             text[]      default '{}'
preferred_age_min       integer     default 18
preferred_age_max       integer     default 25
preferred_distance_miles integer    default 30
preferred_cities        text[]      default '{}'
availability            text[]      default '{}'
safety_status           text        default 'clear'  -- 'clear','warned','suspended'
created_at              timestamptz default now()
updated_at              timestamptz default now()
```

### duos
```
id                    uuid        PK
name                  text        not null
creator_user_id       uuid        FK → users.id
partner_user_id       uuid        FK → users.id, nullable
partner_invite_contact text       nullable  -- phone/email before they join
status                text        default 'pending'  -- 'pending','active','inactive'
bio                   text        nullable
shared_vibes          text[]      default '{}'
looking_for           text[]      default '{}'
preferred_spots       text[]      default '{}'
card_photo_url        text        nullable
created_at            timestamptz default now()
updated_at            timestamptz default now()
```

Status rules:
- `pending` = partner not yet joined
- `active` = both members present and duo can send/receive requests
- `inactive` = duo dissolved or member left

### duo_members
```
id          uuid        PK
duo_id      uuid        FK → duos.id
user_id     uuid        FK → users.id
role        text        -- 'creator', 'partner'
status      text        -- 'active', 'left', 'invited'
created_at  timestamptz default now()
```

### match_requests
```
id              uuid        PK
from_duo_id     uuid        FK → duos.id
to_duo_id       uuid        FK → duos.id
vibe            text        not null
preferred_time  text        not null
message         text        nullable
status          text        default 'pending'  -- 'pending','accepted','declined','cancelled'
created_at      timestamptz default now()
responded_at    timestamptz nullable
```

Constraint: from_duo_id ≠ to_duo_id. Cannot request same duo twice while a pending request exists.

### matches
```
id          uuid        PK
duo_a_id    uuid        FK → duos.id
duo_b_id    uuid        FK → duos.id
request_id  uuid        FK → match_requests.id, unique
status      text        default 'active'  -- 'active','completed','cancelled'
matched_at  timestamptz default now()
created_at  timestamptz default now()
```

### hangout_plans
```
id                    uuid        PK
match_id              uuid        FK → matches.id
place_name            text        nullable
place_address         text        nullable
city                  text        nullable
scheduled_time        timestamptz nullable
vibe                  text        nullable
public_place_only     boolean     default true
confirmed_by_user_ids uuid[]      default '{}'
status                text        default 'planning'  -- 'planning','confirmed','done','cancelled'
created_at            timestamptz default now()
updated_at            timestamptz default now()
```

### chat_threads
```
id          uuid        PK
match_id    uuid        FK → matches.id, unique
created_at  timestamptz default now()
updated_at  timestamptz default now()
```

One thread per match. No DMs outside of match context.

### chat_messages
```
id               uuid        PK
thread_id        uuid        FK → chat_threads.id
sender_user_id   uuid        FK → users.id
body             text        not null
is_read          boolean     default false
created_at       timestamptz default now()
```

### blocks
```
id                uuid        PK
blocker_user_id   uuid        FK → users.id
blocked_user_id   uuid        FK → users.id
reason            text        nullable
created_at        timestamptz default now()
```

Unique constraint: (blocker_user_id, blocked_user_id). Blocking is one-directional but discovery excludes in both directions.

### reports
```
id                   uuid        PK
reporter_user_id     uuid        FK → users.id
reported_user_id     uuid        FK → users.id, nullable
reported_duo_id      uuid        FK → duos.id, nullable
reported_match_id    uuid        FK → matches.id, nullable
reason               text        not null
details              text        nullable
status               text        default 'open'  -- 'open','reviewed','resolved','dismissed'
created_at           timestamptz default now()
reviewed_at          timestamptz nullable
```

At least one of reported_user_id / reported_duo_id / reported_match_id must be non-null.

### verifications
```
id             uuid        PK
user_id        uuid        FK → users.id
type           text        -- 'phone','school','selfie'
status         text        -- 'pending','verified','failed'
provider       text        nullable  -- 'twilio','manual','hCaptcha'
created_at     timestamptz default now()
verified_at    timestamptz nullable
```

### Key relationships summary

```
users 1──* duo_members *──1 duos
users 1──1 profiles
duos  1──* match_requests (as from or to)
match_requests 1──1 matches
matches 1──1 chat_threads
matches 1──1 hangout_plans
chat_threads 1──* chat_messages
users 1──* blocks
users 1──* reports
users 1──* verifications
```

---

## 6. Discovery + Matching Score v1

> Phase 15 implementation. Deterministic only — no AI, no ML.

### Design rules

- Score used **internally** for feed sort order only.
- Raw score is **never shown** publicly.
- Soft reason labels shown on cards ("Shared vibes", "OC fit", "Similar plan").
- No ranking numbers, no percentage match.
- AI/ML matching comes only after 500+ real matches exist as training data.

### Score breakdown (total: 100 points)

#### Location score — 30 pts
| Condition | Points |
|-----------|--------|
| Exact city match | +30 |
| Same OC cluster (north / south / mid) | +20 |
| General OC | +10 |

OC clusters used in scoring:
- South: Irvine, Newport Beach, Costa Mesa, Laguna Beach, Mission Viejo, Lake Forest, Aliso Viejo, Dana Point, San Clemente, Laguna Niguel
- North: Fullerton, Anaheim, Orange, Brea, Yorba Linda, Buena Park, Cypress, La Habra, Placentia
- Mid: Tustin, Santa Ana, Garden Grove, Westminster, Huntington Beach, Fountain Valley

#### Age score — 20 pts
| Condition | Points |
|-----------|--------|
| All active members within 18–25 | +20 |
| Age unknown (MVP allowance) | +10 |

#### Vibe score — 20 pts
| Shared vibes | Points |
|-------------|--------|
| 3 or more | +20 |
| 2 | +14 |
| 1 | +7 |
| 0 | +0 |

Compares current user's profile vibes + duo shared_vibes against target duo's shared_vibes.

#### Intent score — 10 pts
| Condition | Points |
|-----------|--------|
| Overlapping looking_for / intent arrays | +10 |
| Either side has no intent set | +5 |

#### Availability score — 10 pts
Reserved. Current schema does not store availability on duos — only on profiles.
Returns +3 (baseline) until duo-level availability is added.

#### Trust score — 10 pts
| Condition | Points |
|-----------|--------|
| At least one member has verification_level ≠ 'none' | +10 |
| No verified members (active duo baseline) | +5 |

### Hard filters (applied before scoring)

- Exclude current user's own duo
- Duos where status ≠ 'active' (already filtered by getActiveDuos)
- TODO: exclude duos with blocked users (bidirectional)
- TODO: exclude duos with any member where safety_status = 'suspended'
- TODO: exclude already-matched duos (deprioritize, don't hide)
- TODO: gender preference filter when stored on profiles
- TODO: distance filter when geolocation added
- TODO: inactive duo filter (no activity in 14+ days)

### Implementation files

| File | Purpose |
|------|---------|
| `src/lib/matching.js` | Score calculation, reason labels, sort helper |
| `src/lib/discovery.js` | Fetch + filter + sort pipeline |
| `src/pages/HomePage.jsx` | Calls discovery, normalizes to card format |
| `src/components/DuoBoxCard.jsx` | Renders reason badges if matchReasons present |

### Soft reason labels shown on cards

| Label | Trigger |
|-------|---------|
| Shared vibes | ≥1 overlapping vibe tag |
| OC fit | Exact city overlap |
| Similar plan | Overlapping looking_for/intent |
| Public spots | Target duo has preferred_spots |

Labels shown on cards only in discovery context. Not shown on mock/fallback data.

### Fallback chain

```
Supabase configured + currentUser present
  → getMyActiveDuo + getMyProfile
  → getDiscoveryDuos (filter + score + sort)
  → normalizeDbDuoToCard (inject matchReasons)
  → show "Duos for you" section

Any failure / no Supabase / no currentUser
  → show mock SECTIONS (original behavior preserved)
```

---

## 7. Place and Time Planning System

### Flow after match

```
Match confirmed
→ MatchScreen shows Instagram + "Plan your 2v2" CTA
→ HangoutPlanCard appears in chat thread
→ Duo A suggests place + time
→ Duo B accepts or counter-suggests
→ When both duos confirm → hangout status = 'confirmed'
→ Reminder notification 2h before scheduled time
```

### Safety rule
First hangout defaults to `public_place_only = true`.
No private addresses, no home meetups in MVP.
This is enforced in the UI: address field not shown, only place name from curated list.

### Static OC place list (MVP)

```
Irvine:         Irvine Spectrum, UCI Campus area, Woodbury Town Center
Fullerton:      Downtown Fullerton, CSUF area, Metlox Fullerton
Newport:        Balboa Island, Fashion Island, Pacific City
Costa Mesa:     The Camp, The Lab, Westside Costa Mesa
Huntington:     Pier Plaza, Pacific City HB
Anaheim:        Anaheim Packing District, Angel Stadium area
Brea:           Downtown Brea, Brea Mall area
Orange:         Old Towne Orange
Boba spots:     Gong cha, 85°C, Ding Tea, Happy Lemon (rotating by city)
Coffee spots:   Portola Coffee, Go Get Em Tiger, Cafecito Organico
```

### Later: Google Places API
- Let users search any OC place by name
- Filter by: open now, distance, type (coffee, park, food, nightlife)
- Auto-suggest based on vibe tag
- Display hours and address

### Confirmation logic
Hangout is `confirmed` when:
- At least one member per duo has confirmed
- OR all four members have confirmed (preferred)
- Scheduled time is set

---

## 8. Safety System

Safety is a core product feature, not a legal checkbox.
The product is safer than traditional dating apps by design (2v2 = built-in accountability), but still needs explicit safety infrastructure.

### MVP safety features (must ship)

| Feature | Where |
|---------|-------|
| 18–25 age gate | Onboarding step 1, enforced server-side |
| Instagram hidden until match | Discovery + detail page |
| Report user/duo | Profile page + chat thread |
| Block user | Profile page + post-match |
| Public place default | Hangout planning |
| Verified badge (optional) | Profile display |
| Empty/incomplete profile blocked from discovery | Discovery query |
| No private address in hangout planner | Hangout planning UI |
| Safe meeting reminder | MatchScreen |

Safe meeting reminder copy:
> "Meet in public first. Trust your gut. It's always okay to leave."

### Phase 2 safety

| Feature | Notes |
|---------|-------|
| Phone verification | Via Twilio or similar |
| School email badge | .edu email confirmation |
| Selfie / liveness check | Cheap third-party API |
| Suspicious message flagging | Keyword list + rate limiting |
| Safety checklist before hangout | In-app prompt 1h before |
| Share hangout plan with a trusted contact | Native share sheet |

### Phase 3 safety

| Feature | Notes |
|---------|-------|
| Admin dashboard | Web-only, separate from app |
| AI scam / harassment detection | Scan messages for known patterns |
| Repeated report auto-review | 3+ reports → auto-flag to admin |
| ID verification partner | Persona, Jumio, or Stripe Identity |
| Safety / SOS button | Passive location share during hangout |

### Safety copy principles

- "Meet in public first." — always visible before first hangout
- "Instagram unlocks only after both duos match." — explanation shown on detail page
- "Never share your home address with a first match." — hangout planning reminder
- "Report or block anytime. No questions asked." — bottom of every profile
- Tone: calm, clear, not alarmist. Safety as a feature, not a warning label.

---

## 9. Verification System

### Verification levels

| Level | How | Trust score contribution |
|-------|-----|--------------------------|
| `none` | Default on signup | +0 |
| `phone_verified` | OTP to phone number | +5 |
| `school_verified` | .edu email confirmed | +5 (stackable) |
| `selfie_verified` | Liveness / selfie API | +5 (stackable) |
| `trusted` | 2+ signals completed | Max trust boost |

### UI badges

- No badge: no indicator shown
- `phone_verified`: small gray checkmark
- `trusted` (2+ signals): orange verified badge

Rule: Do not overuse orange. The orange verified badge should feel meaningful, not decorative.
Only show verified badge if user has `trusted` level.

### Implementation notes

- Store verification records in `verifications` table
- Compute verification_level on `users` table via trigger or app logic
- Verification level feeds directly into matching trust score
- Do not block unverified users from the app — just deprioritize in feed

---

## 10. Chat System

### Rules

1. Chat threads are created only after a mutual match. No pre-match DMs.
2. One thread per match. Group thread for all 4 users (or 2v2 thread — decide in implementation).
3. If a user blocks another user, the chat thread is disabled for both.
4. If a match is cancelled or deleted, chat becomes archived (read-only).
5. If a message is reported, it is preserved in the database for admin review. Do not delete on report.
6. No message editing or deletion in MVP. Keeps accountability.

### Thread structure

Option A: Single thread for all 4 users (simpler)
Option B: Duo-to-duo thread (both members of each duo share one view)

Recommendation: Option B for MVP. Matches the "duo" product concept. Both members of your duo see the same thread. Implementation is a join on duo_members → chat_thread access.

### Backend flow (after match)

```
match created
→ INSERT INTO chat_threads (match_id)
→ Realtime subscription created for both duos
→ Messages stored in chat_messages with sender_user_id
→ Unread count: count(is_read = false) WHERE thread_id = X AND sender ≠ current_user
```

### Chat abuse handling

- In-thread report button → creates report record with reported_match_id
- On report: message preserved, admin notified
- Repeated reports from same user → auto-flag
- Admin can suspend sender without deleting message history

---

## 11. Viral Growth Loops

### A. Duo invite loop (highest priority)

```
User signs up → prompted to invite their +1
→ Sends invite link (sms, iMessage, Instagram DM)
→ Friend signs up via invite → duo becomes active
→ Both notified: "Your duo is live 🔥"
```

This is the #1 growth loop. Every user who signs up should bring one more user.
Measure: invite_sent_rate and invite_conversion_rate.

### B. Share card loop

After match confirmed:
```
MatchScreen → "Share your 2v2"
→ Generates card image: "We matched on meet oc. 🔥"
→ Share to Instagram story, iMessage, etc.
→ Card includes duo name and vibe, no personal info
```

### C. Campus loop

Discovery sections named after campuses and areas:
- "Near UCI"
- "Near CSUF"
- "Newport this weekend"
- "Fullerton Friday"

These labels make OC identity tangible. People want to see who's near their campus.

### D. Scarcity / drop loop

Every Friday at 6pm:
```
Push notification:
"Friday Night 2v2 Drops are live. 4 new duos in your area."
```

Creates a weekly ritual. Drives retention.
Start manually curating "featured" duos. Automate later.

### E. Invite link

```
Every duo gets a shareable link:
meetoc.app/duo/[duo-id]

→ Shows public duo card (blurred members, visible vibe)
→ CTA: "Join meet oc. to see more"
→ When visitor signs up via link, they see the originating duo first
```

### Features to build for growth (in order)

1. Invite link with attribution tracking
2. Share card image generator (canvas/html2canvas)
3. Campus section labels on home feed
4. Friday Night Drops (manual curation → notification)
5. Match story card
6. Campus leaderboard (later)

---

## 12. Monetization Plan

**Rule: Do not monetize until core 2v2 flow works and users return voluntarily.**

Premature monetization kills density. Density is the product in early stage.

### Free forever (core product)

- Create profile
- Create or join a duo
- Browse all duos
- Send up to 3 requests per week
- Chat after match
- Instagram after match
- Hangout planning

### Paid features (Phase J — after 1,000+ active users)

| Feature | Price | Notes |
|---------|-------|-------|
| Boost duo | $1.99/boost | Shows duo at top of feed for 24h |
| Extra requests | $2.99/week | Unlimited requests vs. 3/week free |
| See who requested you | $4.99/month | View incoming requests before deciding |
| Priority weekend match | $4.99/week | Boosted placement Fri–Sat |
| Premium filters | $7.99/month | Filter by school, verification, exact vibe |
| Events access | $10–20/event | 2v2 Mixer events, OC drops |

### Revenue model recommendation

- Social core: free (never gate basic matching)
- Visibility: paid (boost, priority)
- Information: paid (see who requested you)
- Events: paid (high-margin, builds brand)

Do not add Stripe, in-app purchases, or subscription logic until Phase J.

---

## 13. MVP Build Phases

### Phase A — Frontend polish (current)
- All pages built
- Full flow: landing → onboarding → home → detail → request → match → chat
- No backend

### Phase B — Supabase setup
- Install @supabase/supabase-js
- Create supabaseClient.js
- Auth: sign up, sign in, sign out
- Environment variables configured
- App runs with and without Supabase env vars

### Phase C — User profile persistence
- Onboarding saves user + profile to Supabase
- App loads existing profile on return visit
- Auth state persists across sessions
- Photo upload to Supabase Storage (optional, can use initials for now)

### Phase D — Duo system
- Create duo on onboarding step 3
- Invite partner via link/phone
- Partner joins via invite → duo status → active
- Duo detail shows real data

### Phase E — Discovery (real data)
- Fetch duos from database
- Apply hard filters
- Apply matching score
- Home feed shows real duos ranked by score
- Sections: Tonight in OC, Near You, etc.

### Phase F — Request / match
- Send match_request to real duo
- Other duo receives notification
- Accept / decline flow
- Match record created
- Instagram unlocked on match
- Chat thread created

### Phase G — Chat (realtime)
- Chat thread loads messages from database
- New message sends to Supabase
- Realtime subscription: new messages appear instantly
- Unread count shown on BottomNav badge

### Phase H — Safety
- Report user (form → reports table)
- Block user (blocks table)
- Verified badge display
- Admin review: basic web tool or Supabase dashboard

### Phase I — Viral / share
- Invite link with attribution
- Share match card (canvas)
- Campus section labels based on user's school
- Friday Night Drops (manual push notification)

### Phase J — Monetization
- Stripe setup
- Boost duo
- Premium subscription
- In-app purchase flow (iOS/Android)

---

## 14. Supabase Implementation Plan

> Document only. Do not implement yet.

### 1. Install client
```bash
npm install @supabase/supabase-js
```

### 2. Create src/lib/supabaseClient.js
```js
import { createClient } from '@supabase/supabase-js';

const url  = import.meta.env.VITE_SUPABASE_URL;
const key  = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Return null client if env vars missing — app still renders in dev
export const supabase = url && key ? createClient(url, key) : null;
```

### 3. Create .env.example
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

`.env.local` is gitignored. Never commit real keys.

### 4. Create database tables
Run SQL migrations in Supabase SQL editor.
Maintain migration files in `src/db/migrations/` for version control.

### 5. Row Level Security policies

```sql
-- Users can read any active profile (discovery)
CREATE POLICY "Public profiles readable"
  ON users FOR SELECT USING (is_active = true);

-- Users can only update their own record
CREATE POLICY "Own user update"
  ON users FOR UPDATE USING (auth.uid() = id);

-- Duo visible if active
CREATE POLICY "Active duos readable"
  ON duos FOR SELECT USING (status = 'active');

-- Only duo creator can update duo
CREATE POLICY "Duo creator update"
  ON duos FOR UPDATE USING (auth.uid() = creator_user_id);

-- Match requests: only sender or receiver can read
CREATE POLICY "Match requests restricted"
  ON match_requests FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM duo_members WHERE duo_id = from_duo_id
      UNION
      SELECT user_id FROM duo_members WHERE duo_id = to_duo_id
    )
  );

-- Chat messages: only participants can read
CREATE POLICY "Chat messages restricted"
  ON chat_messages FOR SELECT
  USING (
    thread_id IN (
      SELECT ct.id FROM chat_threads ct
      JOIN matches m ON m.id = ct.match_id
      JOIN duo_members dm ON dm.duo_id IN (m.duo_a_id, m.duo_b_id)
      WHERE dm.user_id = auth.uid()
    )
  );

-- Users can only insert their own messages
CREATE POLICY "Own messages only"
  ON chat_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_user_id);
```

### 6. Connect OnboardingFlow
On step 4 submit:
- `supabase.auth.signUp({ email, password })` or phone OTP
- INSERT into users
- INSERT into profiles
- INSERT into duos
- INSERT into duo_members

### 7. Connect HomePage
- `supabase.from('duos').select(...)` with joins
- Apply filters client-side (MVP) or via RPC/edge function
- Sort by matching score

### 8. Connect RequestTwoVTwo
- INSERT into match_requests
- Trigger notification to target duo (Supabase Edge Function or polling)

### 9. Connect MatchScreen
- Real match data from matches table
- Real Instagram handles from users table (only shown after match)

### 10. Connect ChatThreadPage
- `supabase.from('chat_messages').select(...)` for history
- `supabase.channel(thread_id).on('INSERT', ...)` for realtime
- INSERT on send

---

## 15. Engineering Priorities

Build in this order. Do not skip ahead.

| Priority | Task | Why first |
|----------|------|-----------|
| 1 | Auth | Everything else requires knowing who the user is |
| 2 | User profile persistence | Onboarding data must survive app reload |
| 3 | Duo creation | Core product unit |
| 4 | Duo discovery | Core product UX |
| 5 | Request / match system | Core product action |
| 6 | Chat | Keeps users in app post-match |
| 7 | Block / report | Safety before growth |
| 8 | Verification badge | Trust before scale |
| 9 | Invite / share | Growth after core works |
| 10 | Payments | Revenue after retention proven |

**Do not build payments before matching works.**
**Do not build AI before deterministic matching works.**
**Do not build events before core 2v2 flow has real users.**

Measuring success before moving to the next phase:
- Phase B complete when: user can sign up and sign in across sessions
- Phase C complete when: onboarding data persists to database
- Phase D complete when: two real users form an active duo
- Phase E complete when: home feed shows real duos from database
- Phase F complete when: two real duos complete a 2v2 match
- Phase G complete when: four real users chat in real-time after match

---

## 16. Legal / Trust / Safety Notes

> Not legal advice. Product requirements only.

### Must enforce
- 18+ age gate at onboarding (checkbox + server-side age check)
- 25 and under for MVP (prevents older users from targeting younger users)
- OC-only in MVP (enforced by city selection, not GPS)

### Must have before public launch
- Terms of Service (cover: age requirement, prohibited content, account termination, liability)
- Privacy Policy (cover: what data is collected, stored, shared; deletion rights; CCPA compliance for California users)
- Community Guidelines (cover: respect, prohibited behavior, reporting, consequences)

### Must NOT expose before match
- Instagram handles
- Phone numbers
- Last name (first name only on profile)
- Exact location (city only, no GPS coordinates)

### Must handle
- Data deletion requests (CCPA/CPRA): user can request account deletion in settings
- Report / block: must exist before launch
- Content moderation: manual in early stage, documented process required

### Must encourage
- Public place for first meetup (in-app reminder, not just TOS)
- Not sharing home address with matches
- Bringing a friend (this is built into the product — the duo model itself)

### Avoid
- Hosting user-generated content at scale without moderation plan
- Auto-matching or forced pairing without explicit consent from both duos
- Storing any financial data without PCI compliance (use Stripe, never store cards directly)

---

## 17. Immediate Next Coding Tasks

### Phase 12: Supabase Setup

These are the exact next tasks. Do them in order.

**Task 1:** Install Supabase client
```bash
npm install @supabase/supabase-js
```

**Task 2:** Create `src/lib/supabaseClient.js`
- Import createClient
- Read from VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
- Export null-safe client (app works without env vars)

**Task 3:** Create `.env.example`
- Document required env var names
- Add `.env.local` to `.gitignore` (already there but confirm)

**Task 4:** Create `src/lib/auth.js`
- signUp(email, password)
- signIn(email, password)
- signOut()
- getSession()
- onAuthStateChange(callback)

**Task 5:** Create `src/db/migrations/001_initial_schema.sql`
- Full SQL for all tables in Section 5
- All RLS policies from Section 14
- Do not auto-run. Human reviews and runs in Supabase dashboard.

**Task 6:** Create basic AuthPage or integrate auth into OnboardingFlow
- Option A: Separate `/auth` page with email + password
- Option B: Auth baked into onboarding step 1 (recommended — fewer screens)
- Either way: after sign up, continue to profile setup

**Task 7:** Keep app working without Supabase env vars
- All Supabase calls wrapped in null checks
- App renders in full with mock data when Supabase not configured
- `npm run build` must pass with no env vars set

**Task 8:** Verify build passes
```bash
npm run build
```
No TypeScript or import errors. No broken routes.

---

*meet oc. — 2v2 Hangouts for 18–25s in Orange County*
*Bring your friend. Match with another duo. Meet in public.*
