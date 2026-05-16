# meet oc. — Developer Handoff

> 2v2 social hangout app for 18–25s in Orange County.
> "Bring your friend. Match with another duo. Meet in public."

---

## Current Status

Frontend MVP is complete. Backend foundation (Supabase helpers + schema) is written but not yet connected to the UI. The app runs fully on mock data.

```
npm install
npm run dev     → http://localhost:5173
npm run build   → passes, 0 errors
```

---

## Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Frontend | React 18 + Vite 5 | No react-router. useState routing. |
| Styling | Inline styles only | No Tailwind. Tokens in `src/tokens.js`. |
| Font | DM Sans (Google Fonts) | Loaded in `index.html` |
| Icons | Tabler Icons (CDN) | `<i className="ti ti-*">` |
| Routing | `useState` + `go()` | See App.jsx |
| Data | Hardcoded mock | `src/data/duos.js` |
| Backend (ready, not wired) | Supabase | `src/lib/` |
| Deploy | Vercel | No config needed beyond env vars |

---

## File Structure

```
meet-oc/
├── index.html                        ← DM Sans + Tabler Icons CDN
├── vite.config.js
├── .env.example                      ← Copy to .env.local, add Supabase keys
│
├── src/
│   ├── main.jsx                      ← React root
│   ├── App.jsx                       ← Router + global state
│   ├── index.css                     ← Reset + .page-enter animation
│   ├── tokens.js                     ← ALL design tokens (C / F / R / S)
│   │
│   ├── data/
│   │   └── duos.js                   ← DUOS[], SECTIONS[], OC_SPOTS[] mock data
│   │
│   ├── components/
│   │   ├── Button.jsx                ← primary | ghost | disabled
│   │   ├── Tag.jsx                   ← vibe pill, selected/unselected
│   │   ├── TopBar.jsx                ← sticky 56px header
│   │   ├── BottomNav.jsx             ← 5-tab nav (home/explore/hangouts/chat/me)
│   │   ├── DuoBoxCard.jsx            ← home grid card, featured/regular
│   │   └── InstagramButton.jsx       ← <a> link to instagram.com/@handle
│   │
│   ├── pages/
│   │   ├── LandingPage.jsx           ← Marketing page (not logged in)
│   │   ├── OnboardingFlow.jsx        ← 4-step sign-up (mock, not wired to DB)
│   │   ├── HomePage.jsx              ← Duo discovery grid (mock data)
│   │   ├── DuoDetailPage.jsx         ← Duo profile + Request button
│   │   ├── RequestTwoVTwo.jsx        ← Pick vibe/time/message → send
│   │   ├── MatchScreen.jsx           ← Match confirmed + Instagram buttons ★
│   │   ├── HangoutsPage.jsx          ← Pending + Confirmed + OC Spots
│   │   ├── ChatListPage.jsx          ← Dark theme chat list
│   │   ├── ChatThreadPage.jsx        ← Bright (#FAFAF7) chat thread
│   │   └── PlaceholderPage.jsx       ← Stub for unbuilt pages (Explore, Me)
│   │
│   ├── lib/                          ← Supabase helpers (written, NOT connected to UI)
│   │   ├── supabaseClient.js         ← null-safe client + requireSupabase()
│   │   ├── auth.js                   ← signUp / signIn / signOut / getSession
│   │   ├── profile.js                ← createUserProfile / getUserProfile / updateUserProfile
│   │   ├── duos.js                   ← createDuo / getActiveDuos / getDuoById / invitePartner
│   │   ├── matches.js                ← sendMatchRequest / accept / reject / getMatchesForDuo
│   │   ├── chats.js                  ← getMessages / sendMessage / subscribeToMessages
│   │   └── safety.js                 ← blockUser / reportUser / getBlockedUserIds
│   │
│   ├── database/
│   │   ├── schema.sql                ← Full Postgres schema — NOT yet applied to Supabase
│   │   └── rls_notes.md              ← RLS risk analysis + policy design notes
│   │
│   └── docs/
│       └── REAL_PRODUCT_PLAN.md      ← Full product/backend/growth plan
```

---

## Routing

Routing is `useState`-based. No react-router. All navigation goes through the `go()` function in `App.jsx`.

```js
// Signature
go(newPage, duo = null, reqData = null, chat = null)

// Examples
go('home')
go('duo_detail', duoObject)
go('request', duoObject)
go('match', duoObject, { vibe: 'Boba', when: 'Friday', message: '...' })
go('chat_thread', null, null, chatObject)
```

### Route map

| Route key | Page | Notes |
|-----------|------|-------|
| `landing` | LandingPage | Default start |
| `onboarding` | OnboardingFlow | 4 steps |
| `home` | HomePage | Duo grid |
| `duo_detail` | DuoDetailPage | Requires `selectedDuo` |
| `request` | RequestTwoVTwo | Requires `selectedDuo` |
| `match` | MatchScreen | Requires `selectedDuo` + `requestData` |
| `hangouts` | PlaceholderPage | Stub — not built yet |
| `chat` | ChatListPage | Mock data |
| `chat_thread` | ChatThreadPage | Requires `selectedChat` |
| `explore` | PlaceholderPage | Stub |
| `me` | PlaceholderPage | Stub |

---

## Core User Flow (as built)

```
LandingPage
  ↓ [Join the Beta]
OnboardingFlow (4 steps — saves nothing to DB yet)
  ↓ [Your duo is live]
HomePage (mock duo grid)
  ↓ [card tap]
DuoDetailPage
  ↓ [Request 2v2 Hangout]
RequestTwoVTwo (pick vibe + when + message)
  ↓ [Send Request →]
MatchScreen ★ (check mark + Instagram buttons + Back to Home)
  ↓ [instagram.com/@handle opens in browser]
  ↓ [Back to Home]
HomePage

Chat flow:
BottomNav → chat → ChatListPage → row tap → ChatThreadPage
```

---

## Design Tokens (`src/tokens.js`)

All colors, type sizes, spacing, and radii live here. Never hardcode hex values in components.

```js
import { C, F, R, S } from '../tokens';

C.orange    // #FF6A00 — CTA, selected, badge, logo only. Never as background.
C.bg        // #08080A — app background
C.card      // #1C1C1F — card surface
C.white     // #FFFFFF — primary text
C.gray      // #A1A1AA — secondary text
C.border    // #2A2A2E — card borders

F.titleXl   // { fontSize: 28, fontWeight: 800, letterSpacing: '-0.8px' }
F.bodySm    // { fontSize: 14, fontWeight: 400 }
F.label     // { fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }

R.lg        // 12px — buttons
R.xl        // 16px — cards
```

### Orange rule
Orange (`#FF6A00`) is only used for:
- CTA buttons
- Selected state (pills, tabs)
- Badges
- Logo "oc." text
- Unread dot

**Never as a background fill.**

### Only bright space
`ChatThreadPage` is the only screen with a light background (`#FAFAF7`).
Every other screen uses dark theme.

---

## Mock Data (`src/data/duos.js`)

```js
DUOS       // 4 duos: Mia & Jess, Jay & Marcus, Sophie & Ana, Ryan & Kai
SECTIONS   // 4 home sections: TONIGHT IN OC (featured), NEAR YOU, GYM/NIGHT, NEW DUOS
OC_SPOTS   // 6 spots: Boba, Coffee, Beach, Food, Night, Social
```

Each duo has:
- `members[2]` with `{ name, age, city, ig, emoji, avatarBg }`
- `cardBg[2]` — hex colors for the photo split area
- `vibes[]`, `spots[]`, `lookingFor`

---

## Supabase Setup (`src/lib/`)

The helpers are written and tested for import — but **not connected to any UI**.
The app runs entirely on mock data until you wire these in.

### To activate Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Copy `.env.example` → `.env.local`
3. Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
4. Run `src/database/schema.sql` in Supabase Dashboard → SQL Editor
5. Start connecting UI pages to `src/lib/` functions

### Null-safe design

If env vars are missing, `supabase = null` and the app renders normally with mock data.
`requireSupabase()` throws a clear error only when a lib function is explicitly called.

```js
import { isSupabaseConfigured } from './lib/supabaseClient';
// Use this flag to toggle between mock and live data
```

---

## Database Schema (`src/database/schema.sql`)

**Not applied yet.** Apply manually via Supabase SQL Editor.

Tables:

| Table | Purpose |
|-------|---------|
| `users` | App profile (linked to `auth.users` by id) |
| `profiles` | Extended prefs: vibes, intent, age range |
| `duos` | Core product unit |
| `duo_members` | Join: users ↔ duos |
| `match_requests` | Pending 2v2 requests |
| `matches` | Confirmed matches |
| `hangout_plans` | IRL meetup scheduling |
| `chat_threads` | One per match |
| `chat_messages` | Messages inside a thread |
| `blocks` | User-to-user blocks |
| `reports` | Safety reports |
| `verifications` | Phone/school/selfie badges |

Key constraints baked into schema:
- `age check (age >= 18 and age <= 25)` — enforced at DB level, not just UI
- `public_place_only default true` — MVP safety default
- `from_duo_id <> to_duo_id` — can't request yourself
- `unique(blocker_user_id, blocked_user_id)` — no duplicate blocks

---

## RLS Status

RLS is **enabled** on all tables in `schema.sql` but **policies are not yet written**.

With RLS enabled and no policies: no rows are accessible to any client.
This is safe for schema setup — add policies before inserting real user data.

Policy priorities (see `src/database/rls_notes.md` for full analysis):

| Priority | Tables |
|----------|--------|
| P0 — before any real users | `chat_messages`, `reports`, `users` |
| P1 — before launch | `blocks`, `matches`, `match_requests`, `chat_threads`, `verifications` |
| P2 — can be looser initially | `duos`, `profiles`, `duo_members`, `hangout_plans` |

---

## What's Not Built Yet

| Feature | Status |
|---------|--------|
| Explore page | Placeholder stub |
| Me / profile page | Placeholder stub |
| Real auth (sign up / sign in) | Helpers written, UI not connected |
| Onboarding saves to DB | Not connected |
| Home feed from DB | Not connected |
| Real match requests | Not connected |
| Realtime chat | Helper written (`subscribeToMessages`), not wired |
| Block / report UI | Helpers written, no UI trigger yet |
| Push notifications | Not started |
| Photo upload | Not started |
| Invite link | Not started |
| Verification badges | Not started |
| Monetization | Not started |

---

## Next Phase: Phase 13 — Supabase Connect

### Recommended order

1. **Apply schema** — run `schema.sql` in Supabase SQL Editor
2. **Write RLS policies** — P0 tables first (`chat_messages`, `reports`, `users`)
3. **Auth in OnboardingFlow** — step 1 calls `signUpWithEmail`, saves to `public.users`
4. **Session persistence** — `getSession()` on app load, skip landing if logged in
5. **Home feed from DB** — replace `DUOS` mock with `getActiveDuos()`
6. **Real match request** — `RequestTwoVTwo` calls `sendMatchRequest()`
7. **Accept/reject in HangoutsPage** — wire `acceptMatchRequest()` / `rejectMatchRequest()`
8. **Chat from DB** — `ChatThreadPage` calls `getMessages()` + `subscribeToMessages()`

### Do not yet

- Add Stripe
- Add Google Places API
- Add React Router (keep useState routing)
- Add Tailwind
- Add push notifications (Firebase FCM or Expo)

---

## Running Locally

```bash
npm install
npm run dev      # http://localhost:5173 — full mock app, no env vars needed
npm run build    # production build, must pass before deploy
```

To test with real Supabase:
```bash
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

---

## Key Decisions to Preserve

| Decision | Reason |
|----------|--------|
| No react-router | Keeps routing simple for a single-page mobile-first app |
| No Tailwind | Inline styles + tokens = explicit, no class-name abstraction needed at this scale |
| Instagram via `<a>` link only | Instagram TOS forbids automation. Direct link is correct. |
| Orange never as background | Brand rule — orange loses meaning if overused |
| Chat only after match | Safety + product design — no cold DMs |
| `public_place_only = true` by default | Safety — first meetup must be public |
| Age enforced at DB level | Frontend checks can be bypassed. DB constraint cannot. |
| Mock data until DB is wired | App is fully demonstrable without a backend account |

---

*meet oc. — 2v2 Hangouts for 18–25s in Orange County*
*Built with React + Vite + Supabase (pending)*
