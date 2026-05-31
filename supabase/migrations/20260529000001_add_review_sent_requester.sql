-- DUO OC - requester-side review prompt dedup
-- Spec referenced a "join_requests" table; the actual table is
-- hangout_plan_requests. Adds a per-request flag so the requester duo is only
-- prompted once, plus an RLS UPDATE policy so requester members can set it
-- (existing policies only let the plan creator update requests — without this
-- the flag never sticks and the review notification re-fires every 60s).
-- Apply manually: Supabase Dashboard → SQL Editor → paste and run.

ALTER TABLE public.hangout_plan_requests
  ADD COLUMN IF NOT EXISTS review_sent_requester boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'hangout_plan_requests'
      AND policyname = 'plan requests update requester review'
  ) THEN
    CREATE POLICY "plan requests update requester review"
    ON public.hangout_plan_requests FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.duo_members dm
        WHERE dm.duo_id = hangout_plan_requests.requester_duo_id
          AND dm.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.duo_members dm
        WHERE dm.duo_id = hangout_plan_requests.requester_duo_id
          AND dm.user_id = auth.uid()
      )
    );
  END IF;
END $$;
