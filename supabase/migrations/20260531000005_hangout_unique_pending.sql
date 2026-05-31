-- Prevent duplicate active hangout requests between the same two duos.
-- NOTE: the duplicate cleanup MUST run BEFORE creating the unique index,
-- otherwise CREATE UNIQUE INDEX would fail on pre-existing duplicates.

-- 1) Clean up existing duplicates: keep only the most recent active request per
--    duo pair (order-independent), cancel the rest.
UPDATE hangouts h
SET status = 'cancelled'
WHERE status IN ('pending', 'pending_internal', 'countered')
AND id NOT IN (
  SELECT DISTINCT ON (
    LEAST(duo_a_id::text, duo_b_id::text),
    GREATEST(duo_a_id::text, duo_b_id::text)
  ) id
  FROM hangouts
  WHERE status IN ('pending', 'pending_internal', 'countered')
  ORDER BY
    LEAST(duo_a_id::text, duo_b_id::text),
    GREATEST(duo_a_id::text, duo_b_id::text),
    created_at DESC
);

-- 2) Partial unique index: at most one active request per (unordered) duo pair.
CREATE UNIQUE INDEX IF NOT EXISTS
  hangouts_unique_active_pair
ON hangouts (
  LEAST(duo_a_id::text, duo_b_id::text),
  GREATEST(duo_a_id::text, duo_b_id::text)
)
WHERE status IN ('pending', 'pending_internal', 'countered');
