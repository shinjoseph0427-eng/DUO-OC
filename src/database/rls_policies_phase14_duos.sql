-- meet oc. — RLS Policies: Phase 14 — duos + duo_members
-- DO NOT run automatically. Apply manually via Supabase Dashboard → SQL Editor.
-- Apply AFTER rls_policies_phase13.sql. RLS must already be enabled on these tables.
-- Review all policies carefully before applying to a table with real user data.

-- ─────────────────────────────────────────────
-- public.duos
-- ─────────────────────────────────────────────

-- Any authenticated user can read active duos (discovery feed).
create policy "duos: read active"
  on public.duos for select
  to authenticated
  using (status = 'active');

-- A user can read their own duos regardless of status (pending/paused/etc).
create policy "duos: read own"
  on public.duos for select
  to authenticated
  using (
    creator_user_id = auth.uid()
    or partner_user_id = auth.uid()
    or exists (
      select 1 from public.duo_members dm
      where dm.duo_id = id
        and dm.user_id = auth.uid()
        and dm.status = 'active'
    )
  );

-- A user can only create a duo as themselves (creator_user_id must equal auth.uid()).
create policy "duos: insert own"
  on public.duos for insert
  to authenticated
  with check (creator_user_id = auth.uid());

-- Only the creator can update the duo.
-- partner_user_id updates (partner joining) are handled via joinDuoByInvite
-- which runs through the service_role in production.
create policy "duos: update own"
  on public.duos for update
  to authenticated
  using (creator_user_id = auth.uid())
  with check (creator_user_id = auth.uid());

-- No direct DELETE. Use archiveDuo() which sets status = 'archived'.
-- Archived duos remain in DB for data integrity (match history, reports).

-- ─────────────────────────────────────────────
-- public.duo_members
-- ─────────────────────────────────────────────

-- Any authenticated user can read duo_members of active duos
-- (needed to show member counts and names in discovery).
create policy "duo_members: read active"
  on public.duo_members for select
  to authenticated
  using (
    exists (
      select 1 from public.duos d
      where d.id = duo_id
        and d.status = 'active'
    )
  );

-- A user can always read their own membership rows (any status).
create policy "duo_members: read own"
  on public.duo_members for select
  to authenticated
  using (user_id = auth.uid());

-- A user can only insert a membership row for themselves.
-- The creator row is inserted by createDuoWithMember server-side.
-- The partner row is inserted by joinDuoByInvite.
create policy "duo_members: insert own"
  on public.duo_members for insert
  to authenticated
  with check (user_id = auth.uid());

-- A user can only update their own membership row
-- (e.g., changing status from 'active' to 'left').
create policy "duo_members: update own"
  on public.duo_members for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─────────────────────────────────────────────
-- NOTES
-- ─────────────────────────────────────────────
-- 1. These policies assume service_role is used for admin operations
--    (e.g., force-removing a member, moderating a duo).
--    Service_role bypasses RLS entirely — never expose it client-side.
--
-- 2. "duos: read active" and "duos: read own" overlap for active own duos.
--    Supabase combines OR — both policies return the same rows. No conflict.
--
-- 3. joinDuoByInvite updates partner_user_id on a duo the joining user
--    did NOT create. This will fail under "duos: update own".
--    In MVP: run joinDuoByInvite server-side via a Supabase Edge Function
--    with service_role, or add a separate RLS exception for partner join.
--
-- 4. Test each policy with a second test account before enabling real signups.
--    RLS errors surface as empty result sets, not permission errors.
