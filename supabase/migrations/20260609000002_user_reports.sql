-- WEEKLY - user-level reports for solo chat safety.
-- Complements existing user_blocks. Additive only; no destructive changes.

CREATE TABLE IF NOT EXISTS public.user_reports (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_user_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason            text NOT NULL,
  detail            text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_reports_not_self CHECK (reporter_user_id <> reported_user_id)
);

CREATE INDEX IF NOT EXISTS user_reports_reported_idx
  ON public.user_reports (reported_user_id);

CREATE INDEX IF NOT EXISTS user_reports_reporter_idx
  ON public.user_reports (reporter_user_id);

CREATE UNIQUE INDEX IF NOT EXISTS user_reports_unique_reporter_user_reason_idx
  ON public.user_reports (reporter_user_id, reported_user_id, reason);

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_reports insert own" ON public.user_reports;
CREATE POLICY "user_reports insert own" ON public.user_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    reporter_user_id = auth.uid()
    AND reported_user_id <> auth.uid()
  );

DROP POLICY IF EXISTS "user_reports read own" ON public.user_reports;
CREATE POLICY "user_reports read own" ON public.user_reports
  FOR SELECT TO authenticated
  USING (reporter_user_id = auth.uid());
