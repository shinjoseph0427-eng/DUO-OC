-- DUO OC — user-level blocks for Find Homie tab.
-- Homies are individual profiles (no duo yet), so duo-level blocks can't apply.
-- blockUser() in safety.js writes here; getHiddenUserIds() reads here.

CREATE TABLE IF NOT EXISTS public.user_blocks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks (blocker_id);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_blocks'
      AND policyname = 'user_blocks insert own'
  ) THEN
    CREATE POLICY "user_blocks insert own"
    ON public.user_blocks FOR INSERT TO authenticated
    WITH CHECK (blocker_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_blocks'
      AND policyname = 'user_blocks read own'
  ) THEN
    CREATE POLICY "user_blocks read own"
    ON public.user_blocks FOR SELECT TO authenticated
    USING (blocker_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_blocks'
      AND policyname = 'user_blocks delete own'
  ) THEN
    CREATE POLICY "user_blocks delete own"
    ON public.user_blocks FOR DELETE TO authenticated
    USING (blocker_id = auth.uid());
  END IF;
END $$;
