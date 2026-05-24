-- DUO OC - K-track: blocks + reports tables and RLS
-- Required by blockDuo() and reportDuo() in safety.js.
-- Apply manually: Supabase Dashboard → SQL Editor → paste and run.

-- ─── blocks ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.blocks (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_duo_id uuid        NOT NULL REFERENCES public.duos(id) ON DELETE CASCADE,
  blocked_duo_id uuid        NOT NULL REFERENCES public.duos(id) ON DELETE CASCADE,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_duo_id, blocked_duo_id)
);

CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON public.blocks (blocker_duo_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON public.blocks (blocked_duo_id);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'blocks'
      AND policyname = 'blocks insert own duo'
  ) THEN
    CREATE POLICY "blocks insert own duo"
    ON public.blocks FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.duo_members dm
        WHERE dm.duo_id = blocks.blocker_duo_id
          AND dm.user_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'blocks'
      AND policyname = 'blocks read own duo'
  ) THEN
    CREATE POLICY "blocks read own duo"
    ON public.blocks FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.duo_members dm
        WHERE dm.duo_id = blocks.blocker_duo_id
          AND dm.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- ─── reports ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reports (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_duo_id  uuid        NOT NULL REFERENCES public.duos(id) ON DELETE CASCADE,
  reason           text        NOT NULL,
  detail           text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_reported_duo ON public.reports (reported_duo_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter     ON public.reports (reporter_user_id);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reports'
      AND policyname = 'reports insert own duo report'
  ) THEN
    CREATE POLICY "reports insert own duo report"
    ON public.reports FOR INSERT TO authenticated
    WITH CHECK (
      reporter_user_id = auth.uid()
      AND reported_duo_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.duo_members dm
        WHERE dm.duo_id = reports.reported_duo_id
          AND dm.user_id = auth.uid()
      )
    );
  END IF;

  -- Reporter can read their own reports (needed for duplicate-check in safety.js)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reports'
      AND policyname = 'reports read own'
  ) THEN
    CREATE POLICY "reports read own"
    ON public.reports FOR SELECT TO authenticated
    USING (reporter_user_id = auth.uid());
  END IF;
END $$;

-- Unique index to prevent same user reporting same duo for same reason twice.
-- Guarded: only creates if no existing duplicates (safe on empty table).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'reports_unique_reporter_duo_reason_idx'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.reports
      WHERE reported_duo_id IS NOT NULL
      GROUP BY reporter_user_id, reported_duo_id, reason
      HAVING count(*) > 1
    ) THEN
      CREATE UNIQUE INDEX reports_unique_reporter_duo_reason_idx
        ON public.reports (reporter_user_id, reported_duo_id, reason)
        WHERE reported_duo_id IS NOT NULL;
    END IF;
  END IF;
END $$;
