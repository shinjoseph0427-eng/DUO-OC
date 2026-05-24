-- DUO OC - J-track: report threshold sanctions
-- Lightweight private sanctions for repeated safety reports.
-- No deletes, bans, public report counts, or user-facing notifications.

CREATE TABLE IF NOT EXISTS public.duo_sanctions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id         uuid        NOT NULL REFERENCES public.duos(id) ON DELETE CASCADE,
  reason         text        NOT NULL,
  sanction_type  text        NOT NULL DEFAULT 'restricted'
                 CHECK (sanction_type IN ('warning', 'restricted', 'suspended')),
  status         text        NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'resolved')),
  report_count   integer     NOT NULL DEFAULT 3,
  created_at     timestamptz NOT NULL DEFAULT now(),
  resolved_at    timestamptz,
  UNIQUE (duo_id, reason, status)
);

CREATE INDEX IF NOT EXISTS idx_duo_sanctions_duo_id ON public.duo_sanctions (duo_id);
CREATE INDEX IF NOT EXISTS idx_duo_sanctions_status ON public.duo_sanctions (status);
CREATE INDEX IF NOT EXISTS idx_duo_sanctions_reason ON public.duo_sanctions (reason);

ALTER TABLE public.duo_sanctions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF to_regclass('public.reports') IS NOT NULL THEN
    ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'reports'
        AND policyname = 'reports insert own duo report'
    ) THEN
      EXECUTE $policy$
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
        )
      $policy$;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'duo_sanctions'
      AND policyname = 'duo sanctions read own duos'
  ) THEN
    CREATE POLICY "duo sanctions read own duos"
    ON public.duo_sanctions FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.duo_members dm
        WHERE dm.duo_id = duo_sanctions.duo_id
          AND dm.user_id = auth.uid()
      )
    );
  END IF;

  IF to_regclass('public.reports') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'duo_sanctions'
      AND policyname = 'duo sanctions insert threshold'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "duo sanctions insert threshold"
      ON public.duo_sanctions FOR INSERT TO authenticated
      WITH CHECK (
        sanction_type = 'restricted'
        AND status = 'active'
        AND report_count >= 3
        AND (
          SELECT count(DISTINCT r.reporter_user_id)
          FROM public.reports r
          WHERE r.reported_duo_id = duo_sanctions.duo_id
            AND r.reason = duo_sanctions.reason
        ) >= 3
      )
    $policy$;
  END IF;
END $$;

-- Prevent repeated same-category reports from the same user when existing data is clean.
DO $$
BEGIN
  IF to_regclass('public.reports') IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'reports_unique_reporter_duo_reason_idx'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.reports
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

-- Sanitized discovery helper: exposes only duo IDs that should be hidden.
CREATE OR REPLACE FUNCTION public.get_restricted_duo_ids_for_explore()
RETURNS TABLE (duo_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ds.duo_id
  FROM public.duo_sanctions ds
  WHERE ds.status = 'active'
    AND ds.sanction_type = 'restricted';
$$;

REVOKE ALL ON FUNCTION public.get_restricted_duo_ids_for_explore() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_restricted_duo_ids_for_explore() TO authenticated;

-- Boolean gating helper: exposes only restricted/not restricted for one duo.
CREATE OR REPLACE FUNCTION public.is_duo_restricted(p_duo_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.duo_sanctions ds
    WHERE ds.duo_id = p_duo_id
      AND ds.status = 'active'
      AND ds.sanction_type = 'restricted'
  );
$$;

REVOKE ALL ON FUNCTION public.is_duo_restricted(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_duo_restricted(uuid) TO authenticated;

-- Private threshold evaluator for clients that cannot read report rows under RLS.
CREATE OR REPLACE FUNCTION public.evaluate_duo_sanction(p_duo_id uuid, p_reason text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  unique_report_count integer;
  normalized_reason text := lower(trim(p_reason));
BEGIN
  IF p_duo_id IS NULL OR p_reason IS NULL THEN
    RETURN false;
  END IF;

  IF normalized_reason IN ('not a fit', 'not_a_fit') OR normalized_reason NOT IN (
    'unsafe',
    'disrespectful',
    'harassment',
    'fake_profile',
    'fake profile',
    'other'
  ) THEN
    RETURN false;
  END IF;

  SELECT count(DISTINCT r.reporter_user_id)
  INTO unique_report_count
  FROM public.reports r
  WHERE r.reported_duo_id = p_duo_id
    AND r.reason = p_reason;

  IF unique_report_count < 3 THEN
    RETURN false;
  END IF;

  INSERT INTO public.duo_sanctions (
    duo_id,
    reason,
    sanction_type,
    status,
    report_count
  )
  VALUES (
    p_duo_id,
    p_reason,
    'restricted',
    'active',
    unique_report_count
  )
  ON CONFLICT (duo_id, reason, status) DO NOTHING;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_duo_sanction(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.evaluate_duo_sanction(uuid, text) TO authenticated;
