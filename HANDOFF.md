# DUO OC — Handoff

_Last updated: 2026-06-01_

2v2 social hangout app for 18–25 year olds in Orange County. Bring a friend → form a duo → match with another duo → hang out.

---

## Stack
- **React 18 + Vite 5** SPA. **No react-router** — routing is `useState('page')` + a `go()` function in `src/App.jsx`. Pages are conditionally rendered inside `<div key={page} className="page-enter">` (remount on nav). Back stack via `pageStack`.
- **Supabase** (Postgres + Auth + Realtime + Storage + Edge Functions). Client uses the **anon key**; everything is gated by **RLS** (all policies are `TO authenticated`).
- **Firebase FCM** web push. **html2canvas** for image export. framer-motion, lucide-react, canvas-confetti.
- Deploy: **Vercel** (`duo-oc.com`). `vercel.json` SPA-fallbacks all paths → `/index.html` (so `/duo/[id]` loads the app).
- GitHub: `shinjoseph0427-eng/DUO-OC`, branch `main`. Working dir: `c:\Users\jiseo\Documents\DUO OC`.
- No TypeScript, no tests, no ESLint config. Single bundle (~1.16 MB after html2canvas).

## Key files
- `src/App.jsx` — routing, global state, auth/onboarding guards, deep-link parsing.
- `src/tokens.js` — design tokens. **Light theme**; names are legacy (`C.white = #111` text, `C.bg = #FFF`). Accent `C.amber = #FF6B00`.
- `src/lib/` — `auth, profile, duos, homie, hangouts, messages, duoRoomMessages, notifications, reviews, safety, invites, firebase, publicDuo, upload, constants`.
- `src/hooks/` — `usePlanStatus, useReviewPrompt, useOnboardingGuide`.
- `supabase/migrations/` — schema source of truth (the old `src/database/schema.sql` is STALE "meet oc" design, ignore it).
- `supabase/functions/send-push-notification/` — FCM v1 sender edge function.

## Real Supabase tables (from app code, not schema.sql)
`profiles, duos, duo_members, homie_requests, hangouts, hangout_plans, hangout_plan_requests, messages, duo_messages, notifications, post_hangout_reviews, blocks, user_blocks, duo_sanctions, duo_invites`
- FCM token stored in `profiles.fcm_token` (single device).
- `profiles.deleted_at` added for soft-delete (account deletion) — **migration pending push**.

---

## ⚠️ PENDING DEPLOYS (blocked on Supabase auth token)

`npx supabase` is installed (v2.103.0) and the project is linked (`utfswelaqpannaftfvox`), but there is **no access token** in this environment, so the CLI can't run. `supabase login` is interactive (can't be done from the agent shell).

**To unblock:** run `npx supabase login` once in a terminal (or set `$env:SUPABASE_ACCESS_TOKEN=sbp_...`), then run:

```powershell
npx supabase db push
npx supabase functions deploy send-push-notification
```

### Migrations not yet applied (apply in timestamp order — db push handles this)
1. `20260601000000_homie_accepted_name_payload.sql` — adds `accepted_by_name` to homie_accepted notif payload.
2. `20260601000001_delete_user_account.sql` — adds `profiles.deleted_at` + `delete_user_account()` RPC. **Required for account deletion.**
3. `20260601000002_get_public_duo.sql` — `get_public_duo(uuid)` RPC for the public share page. **Depends on `deleted_at` from #2.**

### Edge function not yet (re)deployed
`send-push-notification` — local `SUPPORTED_TYPES` has 6 types incl. `homie_accepted` + `hangout_confirmed`, and the push icon was fixed to `/icon.png`. **Until deployed, `homie_accepted` / `hangout_confirmed` pushes are silently skipped in prod** (only `homie_request` / `hangout_request` push works).

**Until these run:** account deletion errors out, the public `/duo/[id]` page shows "not found", and the two key transactional push types don't fire. Frontend for all of these is already live.

---

## What works (verified by code trace)
Core loop is solid end-to-end:
1. **Signup → profile** (`AuthPage` → `OnboardingFlow` → `profiles`). ⚠️ depends on Supabase "email confirmation" project setting being OFF, else session won't exist post-signup.
2. **Find Homie → request → accept → duo** (`findHomies` now excludes only blocked users + self; `acceptHomieRequest` creates the duo with rollback on failure).
3. **Create Plan → join request → accept → chat** and **Hangout Request → accept → chat** — both create a confirmed `hangouts` row and auto-navigate into the chat thread.
4. **Chat** — hangout (`messages`) + duo room (`duo_messages`), realtime via `supabase.channel`.
5. **Onboarding guide** — 5-step bottom sheet + BottomNav tab pulse (`useOnboardingGuide`, gate key `duo_oc_onboarding_v2`; step 3 is event-gated on `homie_accepted`).

## Features added this session
- **UX flow fixes**: home homie-request banner; post-accept celebration (`HomieAcceptedCelebration`); Hangout tabs simplified to Upcoming + Requests (Past behind a toggle); auto-navigate to chat on confirm; 4-person `hangout_confirmed` push to both duos; home "this week's confirmed hangout" card.
- **Find Homie**: now shows all non-blocked users (was over-excluding former homies).
- **Account deletion** (App Store req): `deleteAccount()` + EditProfile danger button + confirm modal + soft-delete RPC.
- **ErrorBoundary** wrapping `<App/>` in `main.jsx`.
- **Removed dead code**: `FirstTimeGuide.jsx`, `DuoActionsGuide.jsx`, `MePage.jsx`. Removed latent `setRequestData` crash in `go()`.
- **PWA**: `public/manifest.json` + `<link rel="manifest">`. FCM token refresh via `watchTokenRefresh` (visibilitychange; v9 SDK has no `onTokenRefresh`).
- **DUO CARD public share**: `get_public_duo` RPC + `src/lib/publicDuo.js` + `PublicDuoPage.jsx` + `/duo/[id]` deep-link parsing in App.jsx (added `public_duo` to PAGES/PUBLIC_PAGES).
- **Share sheet**: `DuoShareSheet.jsx` — 9:16 dark viral card, **html2canvas image export** (Instagram story) + Web Share link fallback. Opened from MyDuoPage "카드 공유".

## Known issues / gaps
- **Account deletion is soft-delete only.** No re-login block (a soft-deleted user can still log in), no app-wide `deleted_at` filtering in `findHomies`/`getExploreDuos`, no hard `auth.users` deletion. For full compliance: add a re-login guard + service-role edge function to scrub PII.
- **iOS web push** needs an installed PWA; manifest exists but verify on device.
- **html2canvas + Supabase Storage photos**: CORS can taint the canvas → image save fails for photo cards (initials-only cards always work). `<a download>` is ignored by iOS Safari (opens preview instead) — consider `navigator.share({files})`.
- **Public `/duo/[id]` for logged-in-but-not-onboarded users** gets bounced to `onboarding` by the profile-load effect. Anon + onboarded users see it fine.
- **Per-duo link previews (OG)** are generic; would need an `/api/duo/[id]` SSR function.
- **`createNotificationForUser` doesn't fire push** (only `createNotificationsForDuo` does) — some notif types are in-app only. All push calls are `.catch(()=>{})` (silent failures, no logging).
- **No notificationclick handler** in `firebase-messaging-sw.js` (push tap doesn't deep-link).
- **No account recovery / ToS** verified; bundle not code-split.
- `getMyDuos` profiles select has no `school` → share card subtitle falls back to city.

## Landing page note
Landing → auth/login navigation was investigated and is **correct** (buttons wired, `auth`/`login` in `PUBLIC_PAGES`, guards allow them). If "nothing works" recurs, it's an environment/loading issue (stuck on `app-loading` if `INITIAL_SESSION` never fires, or ErrorBoundary screen from missing Supabase env), not the routing.

## localStorage keys
- `duo_oc_onboarding_v2` — onboarding guide progress (`'done'` or step count).
- `duo_oc_invite_token` (sessionStorage) — invite deep-link token.

## Dev
- `npm run dev` — vite (frontend only; `/api` + Firebase/Places env may be absent).
- `npm run dev:full` — `vercel dev` (boots `/api` functions too). **Do NOT** set `dev` to `vercel dev` (recursion).
- `npm run build` — vite build (used to verify after every change).
