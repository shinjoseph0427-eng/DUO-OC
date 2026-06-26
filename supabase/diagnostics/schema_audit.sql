-- ============================================================================
-- READ-ONLY production schema audit (no writes).
-- Run each numbered block SEPARATELY in the Supabase SQL Editor — the editor
-- only shows the result of the LAST statement when several are run together.
-- Paste each block's result back for comparison against the migration files.
-- ============================================================================

-- Q1 — Which tables actually exist (confirm notifications / homie_requests /
--      solo_match_reads presence; solo_match_reads should be ABSENT until the
--      new migration is applied).
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;


-- Q2 — profiles: every column (name, type, nullable, default).
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY column_name;


-- Q3 — notifications: full column structure.
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'notifications'
ORDER BY column_name;


-- Q4 — core solo/weekly tables: all columns, grouped by table.
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'solo_matches', 'solo_requests', 'solo_messages',
    'solo_plans', 'solo_plan_guests', 'weekly_cards', 'solo_match_reads'
  )
ORDER BY table_name, column_name;


-- Q5 — all CHECK constraints (full definitions). Look for notifications_type_check.
SELECT rel.relname AS table_name,
       con.conname  AS constraint_name,
       pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class     rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public' AND con.contype = 'c'
ORDER BY rel.relname, con.conname;


-- Q6 — all FOREIGN KEYs on the core tables (confirm targets + ON DELETE rule).
SELECT rel.relname AS table_name,
       con.conname  AS constraint_name,
       pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class     rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public' AND con.contype = 'f'
  AND rel.relname IN (
    'notifications', 'profiles', 'solo_matches', 'solo_requests',
    'solo_messages', 'solo_plans', 'solo_plan_guests'
  )
ORDER BY rel.relname, con.conname;


-- Q7 — all UNIQUE indexes (incl. partial ones like solo_matches_active_pair_uniq).
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND indexdef ILIKE '%unique%'
ORDER BY tablename, indexname;


-- Q8 — RLS enabled flag per table.
SELECT rel.relname AS table_name, rel.relrowsecurity AS rls_enabled
FROM pg_class rel
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public' AND rel.relkind = 'r'
ORDER BY rel.relname;


-- Q9 — RLS policies (name, command, roles, USING, WITH CHECK), grouped by table.
SELECT tablename, policyname, cmd, roles, qual AS using_expr, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
