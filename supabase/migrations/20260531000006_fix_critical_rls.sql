-- CRITICAL: enable RLS on tables that were left unprotected (profiles, matches,
-- match_requests). NOTE: Postgres has no "CREATE POLICY IF NOT EXISTS", so we
-- DROP POLICY IF EXISTS then CREATE (idempotent / re-runnable).

-- ── profiles ────────────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles select authenticated" ON profiles;
CREATE POLICY "profiles select authenticated"
  ON profiles FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "profiles update own" ON profiles;
CREATE POLICY "profiles update own"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles insert own" ON profiles;
CREATE POLICY "profiles insert own"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- ── matches ─────────────────────────────────────────────────────────────────
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "matches select own duo" ON matches;
CREATE POLICY "matches select own duo"
  ON matches FOR SELECT TO authenticated
  USING (
    duo_a_id IN (SELECT duo_id FROM duo_members WHERE user_id = auth.uid())
    OR
    duo_b_id IN (SELECT duo_id FROM duo_members WHERE user_id = auth.uid())
  );

-- ── match_requests ──────────────────────────────────────────────────────────
ALTER TABLE match_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "match_requests select own" ON match_requests;
CREATE POLICY "match_requests select own"
  ON match_requests FOR SELECT TO authenticated
  USING (
    from_duo_id IN (SELECT duo_id FROM duo_members WHERE user_id = auth.uid())
    OR
    to_duo_id IN (SELECT duo_id FROM duo_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "match_requests insert own duo" ON match_requests;
CREATE POLICY "match_requests insert own duo"
  ON match_requests FOR INSERT TO authenticated
  WITH CHECK (
    from_duo_id IN (SELECT duo_id FROM duo_members WHERE user_id = auth.uid())
  );
