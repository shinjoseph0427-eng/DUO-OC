-- DUO OC - G-track: hangout_plans + hangout_plan_requests tables and RLS
-- Adds the open-plan layer on top of the existing hangout request flow.
-- When a join request is accepted, a confirmed row is inserted into the
-- existing hangouts table — no separate confirmed system needed.
-- Apply manually: Supabase Dashboard → SQL Editor → paste and run.

-- ─── hangout_plans table ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.hangout_plans (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_duo_id uuid        NOT NULL REFERENCES public.duos(id) ON DELETE CASCADE,
  vibe           text,
  date           text,
  time_slot      text,
  place          text,
  message        text,
  status         text        NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open', 'matched', 'cancelled')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz
);

CREATE INDEX IF NOT EXISTS hangout_plans_creator_idx ON public.hangout_plans (creator_duo_id);
CREATE INDEX IF NOT EXISTS hangout_plans_status_idx  ON public.hangout_plans (status);

ALTER TABLE public.hangout_plans ENABLE ROW LEVEL SECURITY;

-- ─── hangout_plan_requests table ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.hangout_plan_requests (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id          uuid        NOT NULL REFERENCES public.hangout_plans(id) ON DELETE CASCADE,
  requester_duo_id uuid        NOT NULL REFERENCES public.duos(id) ON DELETE CASCADE,
  status           text        NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'accepted', 'declined')),
  message          text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, requester_duo_id)
);

CREATE INDEX IF NOT EXISTS plan_requests_plan_idx      ON public.hangout_plan_requests (plan_id);
CREATE INDEX IF NOT EXISTS plan_requests_requester_idx ON public.hangout_plan_requests (requester_duo_id);

ALTER TABLE public.hangout_plan_requests ENABLE ROW LEVEL SECURITY;

-- ─── hangout_plans RLS ───────────────────────────────────────────────────────

DO $$
BEGIN
  -- SELECT: any authenticated user can browse plans
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'hangout_plans'
      AND policyname = 'plans read authenticated'
  ) THEN
    CREATE POLICY "plans read authenticated"
    ON public.hangout_plans FOR SELECT TO authenticated
    USING (auth.uid() IS NOT NULL);
  END IF;

  -- INSERT: only members of the creator duo
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'hangout_plans'
      AND policyname = 'plans insert duo members'
  ) THEN
    CREATE POLICY "plans insert duo members"
    ON public.hangout_plans FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.duo_members dm
        WHERE dm.duo_id = hangout_plans.creator_duo_id
          AND dm.user_id = auth.uid()
      )
    );
  END IF;

  -- UPDATE: only members of the creator duo (cancel, mark matched)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'hangout_plans'
      AND policyname = 'plans update duo members'
  ) THEN
    CREATE POLICY "plans update duo members"
    ON public.hangout_plans FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.duo_members dm
        WHERE dm.duo_id = hangout_plans.creator_duo_id
          AND dm.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.duo_members dm
        WHERE dm.duo_id = hangout_plans.creator_duo_id
          AND dm.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- ─── hangout_plan_requests RLS ───────────────────────────────────────────────

DO $$
BEGIN
  -- SELECT: requester duo members OR plan creator duo members
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'hangout_plan_requests'
      AND policyname = 'plan requests read participants'
  ) THEN
    CREATE POLICY "plan requests read participants"
    ON public.hangout_plan_requests FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.duo_members dm
        WHERE dm.duo_id = hangout_plan_requests.requester_duo_id
          AND dm.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.hangout_plans hp
        JOIN   public.duo_members dm ON dm.duo_id = hp.creator_duo_id
        WHERE  hp.id = hangout_plan_requests.plan_id
          AND  dm.user_id = auth.uid()
      )
    );
  END IF;

  -- INSERT: requester must be a member of requester_duo_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'hangout_plan_requests'
      AND policyname = 'plan requests insert requester'
  ) THEN
    CREATE POLICY "plan requests insert requester"
    ON public.hangout_plan_requests FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.duo_members dm
        WHERE dm.duo_id = hangout_plan_requests.requester_duo_id
          AND dm.user_id = auth.uid()
      )
    );
  END IF;

  -- UPDATE: only plan creator duo members (accept / decline)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'hangout_plan_requests'
      AND policyname = 'plan requests update plan owner'
  ) THEN
    CREATE POLICY "plan requests update plan owner"
    ON public.hangout_plan_requests FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.hangout_plans hp
        JOIN   public.duo_members dm ON dm.duo_id = hp.creator_duo_id
        WHERE  hp.id = hangout_plan_requests.plan_id
          AND  dm.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.hangout_plans hp
        JOIN   public.duo_members dm ON dm.duo_id = hp.creator_duo_id
        WHERE  hp.id = hangout_plan_requests.plan_id
          AND  dm.user_id = auth.uid()
      )
    );
  END IF;
END $$;
