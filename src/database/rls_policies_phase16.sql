-- ─── Phase 16 RLS: match_requests + matches ──────────────────────────────────
-- Run after schema.sql and rls_policies_phase14_duos.sql.
-- Assumes duo_members and matches tables exist.

-- ─────────────────────────────────────────────────────────────────────────────
-- MATCH REQUESTS
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.match_requests enable row level security;

-- Helper: check that auth.uid() is a member of a given duo.
-- Used inline in each policy rather than as a function to avoid DDL dependency.

-- SELECT: users may only see requests involving one of their duos.
create policy "match_requests: select own"
  on public.match_requests for select
  to authenticated
  using (
    exists (
      select 1 from public.duo_members dm
      where dm.user_id = auth.uid()
        and dm.status  = 'active'
        and (dm.duo_id = match_requests.from_duo_id
          or dm.duo_id = match_requests.to_duo_id)
    )
  );

-- INSERT: only a member of from_duo_id may create the request.
-- DB unique index prevents duplicate pending requests at the row level.
create policy "match_requests: insert own"
  on public.match_requests for insert
  to authenticated
  with check (
    exists (
      select 1 from public.duo_members dm
      where dm.user_id = auth.uid()
        and dm.status  = 'active'
        and dm.duo_id  = from_duo_id
    )
    and from_duo_id <> to_duo_id  -- no self-requests (belt + braces)
  );

-- UPDATE: only a member of to_duo_id may accept/decline (change status).
-- from_duo_id may also cancel their own request.
create policy "match_requests: update respondent"
  on public.match_requests for update
  to authenticated
  using (
    exists (
      select 1 from public.duo_members dm
      where dm.user_id = auth.uid()
        and dm.status  = 'active'
        and (dm.duo_id = match_requests.to_duo_id
          or dm.duo_id = match_requests.from_duo_id)
    )
  )
  with check (
    -- Respondent (to_duo) may only set accepted or rejected.
    -- Requester (from_duo) may only set cancelled.
    -- Prevent status manipulation beyond these values.
    status in ('accepted', 'rejected', 'cancelled')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- MATCHES
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.matches enable row level security;

-- Helper expression: auth.uid() is a member of duo_a_id or duo_b_id.
-- Used in both SELECT and UPDATE policies.

-- SELECT: only members of the matched duos may read the match row.
create policy "matches: select members"
  on public.matches for select
  to authenticated
  using (
    exists (
      select 1 from public.duo_members dm
      where dm.user_id = auth.uid()
        and dm.status  = 'active'
        and (dm.duo_id = matches.duo_a_id
          or dm.duo_id = matches.duo_b_id)
    )
  );

-- INSERT: inserted by the accept flow.
-- The accepting user must be a member of the to_duo (duo_b).
-- from_duo becomes duo_a; to_duo becomes duo_b.
create policy "matches: insert on accept"
  on public.matches for insert
  to authenticated
  with check (
    exists (
      select 1 from public.duo_members dm
      where dm.user_id = auth.uid()
        and dm.status  = 'active'
        and dm.duo_id  = duo_b_id
    )
    -- Verify the source request exists and belongs to these duos.
    and exists (
      select 1 from public.match_requests mr
      where mr.id          = request_id
        and mr.from_duo_id = duo_a_id
        and mr.to_duo_id   = duo_b_id
        and mr.status      = 'accepted'
    )
  );

-- UPDATE: allow members of either duo to update (e.g., pausing/archiving match).
-- status changes (active → archived) only — no switching duo IDs.
create policy "matches: update members"
  on public.matches for update
  to authenticated
  using (
    exists (
      select 1 from public.duo_members dm
      where dm.user_id = auth.uid()
        and dm.status  = 'active'
        and (dm.duo_id = matches.duo_a_id
          or dm.duo_id = matches.duo_b_id)
    )
  )
  with check (
    -- duo IDs must not change
    duo_a_id = matches.duo_a_id
    and duo_b_id = matches.duo_b_id
  );
