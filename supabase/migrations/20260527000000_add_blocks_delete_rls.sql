-- DUO OC — add DELETE policy to blocks table so unblockDuo() actually works.
-- Previously only INSERT + SELECT policies existed; DELETE was blocked by RLS.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'blocks'
      AND policyname = 'blocks delete own duo'
  ) THEN
    CREATE POLICY "blocks delete own duo"
    ON public.blocks FOR DELETE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.duo_members dm
        WHERE dm.duo_id = blocks.blocker_duo_id
          AND dm.user_id = auth.uid()
      )
    );
  END IF;
END $$;
