-- DUO OC - F-track: hangouts + messages tables and RLS
-- Creates both tables (safe if they already exist in the dashboard) and
-- applies full RLS so the chat flow is locked to participants only.
-- Apply manually: Supabase Dashboard → SQL Editor → paste and run.

-- ─── hangouts table ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.hangouts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_a_id    uuid        NOT NULL REFERENCES public.duos(id) ON DELETE CASCADE,
  duo_b_id    uuid        NOT NULL REFERENCES public.duos(id) ON DELETE CASCADE,
  proposed_by uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date        text,
  time_slot   text,
  place       text,
  vibe        text,
  message     text,
  status      text        NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'countered', 'confirmed', 'declined')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hangouts_duo_a_idx ON public.hangouts (duo_a_id);
CREATE INDEX IF NOT EXISTS hangouts_duo_b_idx ON public.hangouts (duo_b_id);

ALTER TABLE public.hangouts ENABLE ROW LEVEL SECURITY;

-- ─── messages table ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.messages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  hangout_id      uuid        NOT NULL REFERENCES public.hangouts(id) ON DELETE CASCADE,
  sender_duo_id   uuid        NOT NULL REFERENCES public.duos(id),
  sender_user_id  uuid        NOT NULL REFERENCES public.profiles(id),
  content         text        NOT NULL
                  CHECK (char_length(trim(content)) >= 1
                    AND  char_length(trim(content)) <= 500),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_hangout_created_idx
  ON public.messages (hangout_id, created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ─── hangouts RLS ────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- SELECT: member of either participating duo
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'hangouts'
      AND policyname = 'hangouts read participants'
  ) THEN
    CREATE POLICY "hangouts read participants"
    ON public.hangouts FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.duo_members dm
        WHERE dm.user_id = auth.uid()
          AND (dm.duo_id = hangouts.duo_a_id OR dm.duo_id = hangouts.duo_b_id)
      )
    );
  END IF;

  -- INSERT: proposer must be in duo_a and must be the proposed_by user
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'hangouts'
      AND policyname = 'hangouts insert proposer'
  ) THEN
    CREATE POLICY "hangouts insert proposer"
    ON public.hangouts FOR INSERT TO authenticated
    WITH CHECK (
      proposed_by = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.duo_members dm
        WHERE dm.duo_id = hangouts.duo_a_id AND dm.user_id = auth.uid()
      )
    );
  END IF;

  -- UPDATE: any member of either duo can update (accept, decline, counter)
  -- Application code enforces the finer role rules (duo_b accepts, duo_a counters, etc.)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'hangouts'
      AND policyname = 'hangouts update participants'
  ) THEN
    CREATE POLICY "hangouts update participants"
    ON public.hangouts FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.duo_members dm
        WHERE dm.user_id = auth.uid()
          AND (dm.duo_id = hangouts.duo_a_id OR dm.duo_id = hangouts.duo_b_id)
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.duo_members dm
        WHERE dm.user_id = auth.uid()
          AND (dm.duo_id = hangouts.duo_a_id OR dm.duo_id = hangouts.duo_b_id)
      )
    );
  END IF;
END $$;

-- ─── messages RLS ────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- SELECT: member of either duo in the confirmed hangout
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'messages'
      AND policyname = 'messages read participants'
  ) THEN
    CREATE POLICY "messages read participants"
    ON public.messages FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM   public.hangouts h
        JOIN   public.duo_members dm
               ON (dm.duo_id = h.duo_a_id OR dm.duo_id = h.duo_b_id)
        WHERE  h.id = messages.hangout_id
          AND  dm.user_id = auth.uid()
          AND  h.status = 'confirmed'
      )
    );
  END IF;

  -- INSERT: sender must be auth.uid() and a member of the confirmed hangout
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'messages'
      AND policyname = 'messages insert participants'
  ) THEN
    CREATE POLICY "messages insert participants"
    ON public.messages FOR INSERT TO authenticated
    WITH CHECK (
      sender_user_id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM   public.hangouts h
        JOIN   public.duo_members dm
               ON (dm.duo_id = h.duo_a_id OR dm.duo_id = h.duo_b_id)
        WHERE  h.id = messages.hangout_id
          AND  dm.user_id = auth.uid()
          AND  h.status = 'confirmed'
      )
    );
  END IF;
END $$;

-- ─── realtime ────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
  AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE  pubname = 'supabase_realtime'
      AND  schemaname = 'public'
      AND  tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;
