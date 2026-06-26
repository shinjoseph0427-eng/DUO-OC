# ⚠️ This folder is LEGACY / NON-AUTHORITATIVE

The SQL files in `src/database/` are **outdated design drafts** from an earlier
"meet oc." version of this product. **They do NOT describe the database the app
actually runs against** and are not applied by any build or deploy step.

Do not use these files to understand the current schema. They reference tables
and a `public.users` + split-`profiles` model that the live app does not use.

## Where the real schema lives

The authoritative, applied schema is the Supabase migration chain:

```
supabase/migrations/*.sql   ← single source of truth, applied in filename order
```

Key entry points for a new developer:

- `supabase/migrations/20260516000000_initial_schema.sql` — original tables
- `supabase/migrations/20260516000001_reconcile_core_schema.sql` — **reconciliation**:
  creates the columns/tables that were previously only hand-added in production
  (`profiles` extra columns, `notifications`, legacy `homie_requests`) so a fresh
  database can be built from migrations alone.
- `supabase/migrations/20260601000003_solo_feature.sql` — solo requests/matches/messages
- `supabase/migrations/20260602000000_weekly_cards.sql` — weekly availability + matching RPC
- `supabase/migrations/20260609000000_solo_plans.sql` — the PLAN feature
- `supabase/migrations/20260609000001_solo_plan_guests.sql` — +1 guests
- later `2026061x` / `2026062x` files — fixes, indexes, unread-read tracking

## Active product tables (WEEKLY core loop)

`profiles`, `weekly_cards`, `solo_requests`, `solo_matches`, `solo_messages`,
`solo_plans`, `solo_plan_guests`, `solo_match_reads`, `user_blocks`,
`user_reports`, `notifications`.

Tables prefixed/related to the abandoned 2-on-2 DUO product (`duos`,
`duo_members`, `match_requests`, `matches`, `hangouts`, `hangout_plans`,
`homie_requests`, `duo_messages`, `messages`, `reports`, `blocks`,
`duo_sanctions`, `post_hangout_reviews`) still exist but are **not part of the
current loop**. Leave them in place unless a deliberate cleanup is scoped.

## Files in this folder (all legacy)

- `schema.sql` — old "meet oc." schema, not applied anywhere
- `rls_policies_phase13.sql`, `rls_policies_phase14_duos.sql`, `rls_policies_phase16.sql` — old RLS drafts
- `rls_notifications.sql`, `rls_notes.md` — old RLS notes

These are kept only for historical reference. If you want the current RLS, read
the policies inside `supabase/migrations/`.
