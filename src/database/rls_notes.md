# meet oc. — Row Level Security Design Notes
> For developer review before Phase 13 implementation.

---

## Why RLS matters

Supabase exposes your database directly to the client via the anon key.
Without Row Level Security, any authenticated user can run:

```sql
select * from chat_messages;
select * from reports;
select * from blocks;
```

and read data they should never see.

RLS is the only layer that enforces data access rules at the database level,
independent of what the frontend does. Even if application code has a bug,
RLS prevents unauthorized reads and writes.

**Enable RLS on every table before connecting real users.**

---

## chat_messages is the highest-risk table

### Why

A chat message contains the most sensitive user data in the app:
- Personal plans (where users intend to go, what time)
- Direct communication between real people
- Potentially contains phone numbers, Instagram handles, or addresses

### The risk without RLS

Any authenticated user with the anon key can query:
```sql
select * from chat_messages order by created_at desc;
```
and read every message in the app.

### Required policy

A user may only read messages in a thread if they are a member of one of the
matched duos. The membership check requires a join:

```
auth.uid()
  → duo_members.user_id
  → duo_members.duo_id
  → must equal matches.duo_a_id or matches.duo_b_id
  → matches.id = chat_threads.match_id
  → chat_threads.id = chat_messages.thread_id
```

This is a 4-level join in the RLS policy. Test it carefully —
incorrect policies silently return zero rows instead of throwing.

---

## Match membership verification

### Why

The match is the authorization boundary for chat, hangout planning, and
Instagram handle visibility. A user who is not part of a match should not
be able to access any of these resources.

### How to implement

For matches, chat_threads, hangout_plans, and chat_messages, the pattern is:

```sql
-- User is a member of duo_a or duo_b in the related match
exists (
  select 1 from public.duo_members dm
  join public.matches m on m.duo_a_id = dm.duo_id or m.duo_b_id = dm.duo_id
  where dm.user_id = auth.uid()
  and m.id = [matches.id or the match_id foreign key]
)
```

This pattern must be tested against real data before going live.
A typo in the join condition returns no rows — hard to debug in production.

---

## reports table: users must not see each other's reports

### Why

If users can read the reports table, they can:
1. Find out if someone reported them
2. Identify their reporter (reporter_user_id is stored)
3. Retaliate against the person who reported them

This destroys the safety system entirely.

### Required behavior

- Users can INSERT a report (reporter_user_id = auth.uid())
- Users can NOT SELECT any report row
- Only the admin/service_role can SELECT and UPDATE reports

The reporter gets no confirmation beyond a UI acknowledgement.
No confirmation email in MVP — it encourages retaliation.

---

## blocks must affect discovery queries

### Why

If the blocks table is not reflected in discovery, a blocked user still
appears in the other person's feed. This is a safety failure, not just
a UX failure.

### Required behavior

Discovery queries (getActiveDuos) must exclude duos where any member:
- Has been blocked by the current user
- Has blocked the current user

Because blocks are user-to-user and duos are pairs of users,
the exclusion must cascade:

```
block between user A and user B
→ exclude any duo where user B is a member
→ this may exclude a duo where user B's duo partner is innocent
→ acceptable tradeoff for safety — the innocent partner can create a new duo
```

### Implementation options

Option A: RLS policy on duos (complex — requires subquery across duo_members + blocks)
Option B: Filter in application query (simpler — pass blocked user IDs from getBlockedUserIds())
Option C: PostgreSQL function / Supabase RPC that handles the join (cleanest)

Recommendation: Start with Option B in Phase 13. Move to Option C at scale.

---

## 18+ must be enforced at the database level

### Why

The onboarding checkbox is a frontend control.
Frontend controls can be bypassed:
- Direct API calls to Supabase
- Inspecting and replaying network requests
- Modified client code

A 17-year-old can set age = 18 in a request body and bypass UI validation.

### Required enforcement

```sql
-- In schema.sql — already included:
age integer not null check (age >= 18 and age <= 25)
```

This constraint lives in the database. Any INSERT or UPDATE that violates it
fails at the DB level regardless of where the call originates.

Additionally, in Phase 13:
- RLS policy on users: users can only insert a row with age between 18 and 25
- Service functions in profile.js must re-validate before inserting

### The 25 cap

For MVP, users over 25 are excluded. This is product-level, not legal.
It enforces the peer-group social dynamic. Remove or adjust for Phase 2 if needed.
The DB constraint is the single source of truth for this rule.

---

## Instagram handles: reveal only after match

### Why

Instagram handle exposure before match is the #1 risk for off-platform contact
before users have vetted each other.

### Required enforcement

Application code controls this: instagram_handle is only shown on MatchScreen.
But RLS can reinforce it:

Option: Create a Supabase view `public_user_profiles` that omits instagram_handle,
and expose only that view to the anon key. The full users table with instagram_handle
is only queryable via a join through matches + duo_members.

This is Phase 13 work. Document it now, implement it then.

---

## Duo RLS Risks

### Discovery vs. ownership boundary

The `duos` table has two overlapping read cases:
1. **Public discovery** — any authenticated user can read `status = 'active'` duos.
2. **Owner view** — creator and partner must see their own duo regardless of status (pending, paused, archived).

These are implemented as two separate SELECT policies. Supabase combines them with OR — no conflict, but test with a non-owner account to confirm the active-only filter holds for strangers.

### joinDuoByInvite: partner can't update a duo they don't own

`joinDuoByInvite` sets `partner_user_id` on a duo whose `creator_user_id` belongs to someone else. The "duos: update own" policy (using `creator_user_id = auth.uid()`) will block this.

**Required solution for production:** Run `joinDuoByInvite` via a Supabase Edge Function with `service_role`, or create a narrow additional policy:

```sql
-- Allow partner to set themselves on a duo they were invited to (by invite contact match)
create policy "duos: partner join"
  on public.duos for update
  to authenticated
  using (partner_invite_contact = (
    select email from auth.users where id = auth.uid()
  ))
  with check (partner_user_id = auth.uid());
```

Add this only after implementing invite-link flow. Do not enable it in MVP.

### duo_members insert: creator row created server-side

`createDuoWithMember` inserts the creator's `duo_members` row immediately after the duo insert. Both run as the authenticated user, so `user_id = auth.uid()` holds — the "duo_members: insert own" policy allows this.

### 'removed' status

`duo_members.status = 'removed'` is for admin-forced removal (report → review → remove). Only `service_role` should set this. The client-side RLS policies do not allow a user to set their own status to 'removed' — they can only set 'left' via "duo_members: update own".

---

## Discovery must eventually exclude

The following cases are **not yet excluded** from the discovery feed as of Phase 15.
Each requires additional query logic and should be addressed before real users are onboarded.

| Exclusion | Current state | How to add |
|-----------|--------------|------------|
| Blocked users (both directions) | TODO | Query `blocks` table, filter duo_members |
| Reported/suspended users | TODO | Filter on `profiles.safety_status != 'clear'` |
| Own duo | ✅ Applied in `discovery.js` | Filter on `duo.id !== myDuo.id` |
| Private/pending duos | ✅ Applied by `getActiveDuos()` | Status filter `= 'active'` |
| Age-ineligible users | Partially enforced via DB constraint | Add RLS check on `users.age` |
| Already-matched duos | TODO | Join against `matches` table |
| Inactive duos (14+ days) | TODO | Filter on `duos.updated_at` |

**Note on blocks:** Blocking is user-to-user, not duo-to-duo. A block between user A and user B must exclude any duo where B is a member — even if B's duo partner is not involved in the block. This is a wider exclusion than it looks.

**Implementation path:** Use a Supabase RPC function or application-layer filter in `getDiscoveryDuos` in `src/lib/discovery.js`. Do not implement as RLS on `duos` directly — the multi-join would be too complex to reason about safely.

---

## Summary: tables and their risk level

| Table            | Risk if unprotected | Priority |
|------------------|--------------------:|:--------:|
| chat_messages    | Highest — private conversations | P0 |
| reports          | High — exposes reporters | P0 |
| users            | High — phone, email, instagram | P0 |
| blocks           | Medium — exposes social graph | P1 |
| matches          | Medium — relationship data | P1 |
| match_requests   | Medium | P1 |
| chat_threads     | Medium — needed to gate messages | P1 |
| verifications    | Medium — personal verification data | P1 |
| duo_members      | Low — membership is semi-public | P2 |
| duos             | Low — discovery is intended public | P2 |
| profiles         | Low — vibes/intent are non-sensitive | P2 |
| hangout_plans    | Low — but contains location info | P2 |

**P0 tables must have RLS policies before any real user data is stored.**
