-- Per-user deletion of ended solo chats.
-- The match and its history remain available to the other participant.

CREATE TABLE IF NOT EXISTS public.solo_chat_deletions (
  match_id   uuid NOT NULL REFERENCES public.solo_matches(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, user_id)
);

CREATE INDEX IF NOT EXISTS solo_chat_deletions_user_idx
  ON public.solo_chat_deletions (user_id);

ALTER TABLE public.solo_chat_deletions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "solo_chat_deletions select own"
  ON public.solo_chat_deletions;
CREATE POLICY "solo_chat_deletions select own"
  ON public.solo_chat_deletions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "solo_chat_deletions insert ended participant"
  ON public.solo_chat_deletions;
CREATE POLICY "solo_chat_deletions insert ended participant"
  ON public.solo_chat_deletions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.solo_matches m
      WHERE m.id = solo_chat_deletions.match_id
        AND m.status = 'ended'
        AND (m.user_a = auth.uid() OR m.user_b = auth.uid())
    )
  );
