-- Prevent concurrent duplicate pending homie requests between the same pair.
-- Cleanup must run BEFORE the unique index, or CREATE UNIQUE INDEX would fail
-- on any pre-existing duplicates. We dedupe via ctid (no created_at dependency),
-- keeping one row per unordered (from,to) pair.

DELETE FROM homie_requests a
USING homie_requests b
WHERE a.status = 'pending'
  AND b.status = 'pending'
  AND a.ctid < b.ctid
  AND LEAST(a.from_user_id::text, a.to_user_id::text) = LEAST(b.from_user_id::text, b.to_user_id::text)
  AND GREATEST(a.from_user_id::text, a.to_user_id::text) = GREATEST(b.from_user_id::text, b.to_user_id::text);

CREATE UNIQUE INDEX IF NOT EXISTS
  homie_requests_unique_pending_pair
ON homie_requests (
  LEAST(from_user_id::text, to_user_id::text),
  GREATEST(from_user_id::text, to_user_id::text)
)
WHERE status = 'pending';
