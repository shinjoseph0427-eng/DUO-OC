-- Add chat/notification tables to the Realtime publication so live INSERT
-- events reach subscribers (ChatThreadPage, NotificationBell, DuoRoomPage).
-- ADD TABLE errors if the table is already a member, so guard each one.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'duo_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.duo_messages;
  END IF;
END $$;
