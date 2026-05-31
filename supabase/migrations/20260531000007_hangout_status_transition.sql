-- Consolidate the hangouts UPDATE policy into a single named policy.
-- NOTE: this policy still authorizes by *membership* (a member of either duo
-- may update). True per-status-transition enforcement lives in the app layer
-- (acceptHangout / declineHangout / counterHangout now verify membership and
-- guard on status). We also drop the real existing policy name
-- ("hangouts update participants" from the ftrack migration) so we don't end up
-- with two overlapping UPDATE policies.
DROP POLICY IF EXISTS "hangouts update own duo" ON hangouts;
DROP POLICY IF EXISTS "duo members can update hangouts" ON hangouts;
DROP POLICY IF EXISTS "hangouts update participants" ON hangouts;
DROP POLICY IF EXISTS "hangouts update restricted" ON hangouts;

CREATE POLICY "hangouts update restricted"
  ON hangouts FOR UPDATE TO authenticated
  USING (
    duo_a_id IN (SELECT duo_id FROM duo_members WHERE user_id = auth.uid())
    OR
    duo_b_id IN (SELECT duo_id FROM duo_members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    duo_a_id IN (SELECT duo_id FROM duo_members WHERE user_id = auth.uid())
    OR
    duo_b_id IN (SELECT duo_id FROM duo_members WHERE user_id = auth.uid())
  );
