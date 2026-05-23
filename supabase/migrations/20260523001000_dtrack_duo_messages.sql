-- DUO OC - D-track Duo Room messages
-- Supabase CLI is not available in this workspace.
-- Paste this file into Supabase Dashboard -> SQL Editor and run it manually.

CREATE TABLE IF NOT EXISTS public.duo_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES public.duos(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (
    char_length(trim(content)) >= 1
    AND char_length(trim(content)) <= 500
  ),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS duo_messages_duo_created_idx
ON public.duo_messages (duo_id, created_at);

ALTER TABLE public.duo_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'duo_messages'
      AND policyname = 'duo_messages select own active duo'
  ) THEN
    CREATE POLICY "duo_messages select own active duo"
    ON public.duo_messages
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.duo_members dm
        JOIN public.duos d ON d.id = dm.duo_id
        WHERE dm.duo_id = duo_messages.duo_id
          AND dm.user_id = auth.uid()
          AND d.status = 'active'
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'duo_messages'
      AND policyname = 'duo_messages insert own active duo'
  ) THEN
    CREATE POLICY "duo_messages insert own active duo"
    ON public.duo_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
      sender_user_id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM public.duo_members dm
        JOIN public.duos d ON d.id = dm.duo_id
        WHERE dm.duo_id = duo_messages.duo_id
          AND dm.user_id = auth.uid()
          AND d.status = 'active'
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'duo_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.duo_messages;
  END IF;
END $$;
