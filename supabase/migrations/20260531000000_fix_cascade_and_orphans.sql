-- Fix FK cascade rules and clean up orphaned rows left behind when a
-- homie (user) / duo was deleted directly in the database.

-- hangouts FK에 CASCADE 추가
ALTER TABLE hangouts
  DROP CONSTRAINT IF EXISTS hangouts_duo_a_id_fkey,
  DROP CONSTRAINT IF EXISTS hangouts_duo_b_id_fkey;

ALTER TABLE hangouts
  ADD CONSTRAINT hangouts_duo_a_id_fkey
    FOREIGN KEY (duo_a_id) REFERENCES duos(id) ON DELETE CASCADE,
  ADD CONSTRAINT hangouts_duo_b_id_fkey
    FOREIGN KEY (duo_b_id) REFERENCES duos(id) ON DELETE CASCADE;

-- 현재 고아 hangout rows 정리
DELETE FROM hangouts
WHERE duo_a_id NOT IN (SELECT id FROM duos)
   OR duo_b_id NOT IN (SELECT id FROM duos);

-- duo_members FK도 CASCADE 확인
ALTER TABLE duo_members
  DROP CONSTRAINT IF EXISTS duo_members_duo_id_fkey;

ALTER TABLE duo_members
  ADD CONSTRAINT duo_members_duo_id_fkey
    FOREIGN KEY (duo_id) REFERENCES duos(id) ON DELETE CASCADE;

-- 고아 duo_members 정리
DELETE FROM duo_members
WHERE duo_id NOT IN (SELECT id FROM duos);
