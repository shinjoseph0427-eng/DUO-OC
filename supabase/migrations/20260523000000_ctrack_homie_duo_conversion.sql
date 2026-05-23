-- DUO OC - C-track Homie -> Duo conversion support
-- Safe to paste into Supabase SQL Editor or apply with `supabase db push`.
-- This migration supports:
-- - duos.status = inactive for deactivated solo duos
-- - unique duo_members rows
-- - homie_accepted notifications
-- - RLS policies needed by the client-side C-track acceptance flow

-- ---------------------------------------------------------------------
-- Schema compatibility
-- ---------------------------------------------------------------------

ALTER TABLE IF EXISTS public.duos
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

ALTER TABLE IF EXISTS public.duos
DROP CONSTRAINT IF EXISTS duos_status_check;

ALTER TABLE IF EXISTS public.duos
ADD CONSTRAINT duos_status_check
CHECK (status IN ('active', 'inactive', 'pending', 'paused', 'archived'));

CREATE UNIQUE INDEX IF NOT EXISTS duo_members_duo_user_unique
ON public.duo_members (duo_id, user_id);

ALTER TABLE IF EXISTS public.notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE IF EXISTS public.notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN (
  'match',
  'hangout_request',
  'homie_request',
  'hangout_accepted',
  'hangout_declined',
  'homie_accepted'
));

-- ---------------------------------------------------------------------
-- RLS enablement
-- ---------------------------------------------------------------------

ALTER TABLE IF EXISTS public.homie_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.duos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.duo_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- homie_requests policies
-- ---------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.homie_requests') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'homie_requests'
         AND policyname = 'homie_requests read own'
     ) THEN
    CREATE POLICY "homie_requests read own"
    ON public.homie_requests
    FOR SELECT
    TO authenticated
    USING (from_user_id = auth.uid() OR to_user_id = auth.uid());
  END IF;

  IF to_regclass('public.homie_requests') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'homie_requests'
         AND policyname = 'homie_requests insert own'
     ) THEN
    CREATE POLICY "homie_requests insert own"
    ON public.homie_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (from_user_id = auth.uid());
  END IF;

  IF to_regclass('public.homie_requests') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'homie_requests'
         AND policyname = 'homie_requests receiver update'
     ) THEN
    CREATE POLICY "homie_requests receiver update"
    ON public.homie_requests
    FOR UPDATE
    TO authenticated
    USING (to_user_id = auth.uid())
    WITH CHECK (to_user_id = auth.uid());
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- duos policies
-- ---------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.duos') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'duos'
         AND policyname = 'duos read active'
     ) THEN
    CREATE POLICY "duos read active"
    ON public.duos
    FOR SELECT
    TO authenticated
    USING (status = 'active');
  END IF;

  IF to_regclass('public.duos') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'duos'
         AND policyname = 'duos read member'
     ) THEN
    CREATE POLICY "duos read member"
    ON public.duos
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.duo_members dm
        WHERE dm.duo_id = duos.id
          AND dm.user_id = auth.uid()
      )
    );
  END IF;

  IF to_regclass('public.duos') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'duos'
         AND policyname = 'duos authenticated insert'
     ) THEN
    CREATE POLICY "duos authenticated insert"
    ON public.duos
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
  END IF;

  IF to_regclass('public.duos') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'duos'
         AND policyname = 'duos member can deactivate solo duo'
     ) THEN
    CREATE POLICY "duos member can deactivate solo duo"
    ON public.duos
    FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.duo_members dm
        WHERE dm.duo_id = duos.id
          AND dm.user_id = auth.uid()
      )
    )
    WITH CHECK (status IN ('active', 'inactive'));
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- duo_members policies
-- ---------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.duo_members') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'duo_members'
         AND policyname = 'duo_members read active duo or own'
     ) THEN
    CREATE POLICY "duo_members read active duo or own"
    ON public.duo_members
    FOR SELECT
    TO authenticated
    USING (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.duos d
        WHERE d.id = duo_members.duo_id
          AND d.status = 'active'
      )
    );
  END IF;

  IF to_regclass('public.duo_members') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'duo_members'
         AND policyname = 'duo_members insert self or accepted homie'
     ) THEN
    CREATE POLICY "duo_members insert self or accepted homie"
    ON public.duo_members
    FOR INSERT
    TO authenticated
    WITH CHECK (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.homie_requests hr
        WHERE hr.to_user_id = auth.uid()
          AND hr.from_user_id = duo_members.user_id
          AND hr.status IN ('pending', 'accepted')
      )
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- notifications policies
-- ---------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.notifications') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'notifications'
         AND policyname = 'authenticated users insert notifications'
     ) THEN
    CREATE POLICY "authenticated users insert notifications"
    ON public.notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
  END IF;

  IF to_regclass('public.notifications') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'notifications'
         AND policyname = 'users read own notifications'
     ) THEN
    CREATE POLICY "users read own notifications"
    ON public.notifications
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
  END IF;

  IF to_regclass('public.notifications') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'notifications'
         AND policyname = 'users update own notifications'
     ) THEN
    CREATE POLICY "users update own notifications"
    ON public.notifications
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;
