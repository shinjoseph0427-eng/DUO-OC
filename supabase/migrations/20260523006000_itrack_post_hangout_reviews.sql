-- DUO OC - I-track: post-hangout reviews
-- Lightweight private review after a confirmed hangout has passed.
-- Apply manually: Supabase Dashboard → SQL Editor → paste and run.

CREATE TABLE IF NOT EXISTS public.post_hangout_reviews (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  hangout_id        uuid        NOT NULL REFERENCES public.hangouts(id)  ON DELETE CASCADE,
  reviewer_user_id  uuid        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  reviewer_duo_id   uuid        NOT NULL REFERENCES public.duos(id)      ON DELETE CASCADE,
  reviewed_duo_id   uuid        NOT NULL REFERENCES public.duos(id)      ON DELETE CASCADE,
  would_hang_again  text        CHECK (would_hang_again IN ('yes', 'maybe', 'no')),
  vibe              text,
  note              text,
  safety_flag       boolean     NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),

  UNIQUE (hangout_id, reviewer_duo_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reviews_hangout_id      ON public.post_hangout_reviews (hangout_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_duo_id ON public.post_hangout_reviews (reviewer_duo_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_user   ON public.post_hangout_reviews (reviewer_user_id);

-- RLS
ALTER TABLE public.post_hangout_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_insert" ON public.post_hangout_reviews;
DROP POLICY IF EXISTS "reviews_select" ON public.post_hangout_reviews;

-- INSERT: reviewer_user_id must be auth.uid(), a member of reviewer_duo_id,
-- and the review must match a confirmed hangout between the two duos.
CREATE POLICY "reviews_insert" ON public.post_hangout_reviews
FOR INSERT TO authenticated
WITH CHECK (
  reviewer_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.duo_members
    WHERE duo_id = reviewer_duo_id
      AND user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.hangouts h
    WHERE h.id = hangout_id
      AND h.status = 'confirmed'
      AND (
        (h.duo_a_id = reviewer_duo_id AND h.duo_b_id = reviewed_duo_id)
        OR
        (h.duo_b_id = reviewer_duo_id AND h.duo_a_id = reviewed_duo_id)
      )
  )
);

-- SELECT: only the submitter or other members of reviewer_duo_id can read
CREATE POLICY "reviews_select" ON public.post_hangout_reviews
FOR SELECT TO authenticated
USING (
  reviewer_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.duo_members
    WHERE duo_id = reviewer_duo_id
      AND user_id = auth.uid()
  )
);
