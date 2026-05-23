-- DUO OC - E-track: Two-person hangout approval
-- Adds receiver vote tracking columns to the hangouts table.
-- MUST be applied manually: Supabase Dashboard → SQL Editor → paste and run.

ALTER TABLE public.hangouts
  ADD COLUMN IF NOT EXISTS receiver_accept_user_ids  uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS receiver_decline_user_ids uuid[] DEFAULT '{}';
