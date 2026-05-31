import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { createNotificationsForDuo } from '../lib/notifications.js';

// Fires a one-time "How was your hangout with <other duo>?" review notification
// to BOTH sides of a matched, elapsed plan:
//   • Creator side  — the user's own plans that reached 'past' and had an
//     accepted join request. Deduped via hangout_plans.review_sent.
//   • Requester side — accepted join requests the user's duo sent, whose plan
//     has reached 'past'. Deduped via hangout_plan_requests.review_sent_requester.
// Plans that merely expired while still open are flagged without a notification
// so they aren't re-checked. Runs on mount + every 60s.
export function useReviewPrompt() {
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data: memberships } = await supabase
        .from('duo_members')
        .select('duo_id')
        .eq('user_id', user.id);
      const duoIds = (memberships ?? []).map((m) => m.duo_id);
      if (duoIds.length === 0 || cancelled) return;

      const { data: plans, error } = await supabase
        .from('hangout_plans')
        .select('id, creator_duo_id, date, review_sent')
        .in('creator_duo_id', duoIds)
        .eq('status', 'past')
        .neq('review_sent', true);

      if (error || cancelled) return; // column/migration missing → safe no-op

      for (const p of plans ?? []) {
        if (cancelled) return;

        // A matched plan has exactly one accepted join request — the requester
        // duo is the counterpart they actually hung out with.
        const { data: acceptedReq } = await supabase
          .from('hangout_plan_requests')
          .select('requester_duo:duos!hangout_plan_requests_requester_duo_id_fkey(name)')
          .eq('plan_id', p.id)
          .eq('status', 'accepted')
          .maybeSingle();

        try {
          if (acceptedReq) {
            await createNotificationsForDuo(p.creator_duo_id, 'review', {
              plan_id:  p.id,
              duo_name: acceptedReq.requester_duo?.name ?? 'the other duo',
              date:     p.date,
              message:  'How was your hangout?',
            });
          }
          // Either way, flag it so we don't re-check this plan every 60s.
          await supabase
            .from('hangout_plans')
            .update({ review_sent: true })
            .eq('id', p.id);
        } catch {
          /* fire-and-forget */
        }
      }

      // ── Requester side ──────────────────────────────────────────────────────
      // Accepted requests this user's duo sent, whose plan has elapsed to 'past'.
      // !inner so we can filter on the embedded plan's status.
      const { data: requests, error: reqErr } = await supabase
        .from('hangout_plan_requests')
        .select('id, plan_id, requester_duo_id, plan:hangout_plans!inner(date, status, creator_duo:duos!hangout_plans_creator_duo_id_fkey(name))')
        .in('requester_duo_id', duoIds)
        .eq('status', 'accepted')
        .eq('plan.status', 'past')
        .neq('review_sent_requester', true);

      if (reqErr || cancelled) return; // column/migration missing → safe no-op

      for (const r of requests ?? []) {
        if (cancelled) return;
        const creatorName = r.plan?.creator_duo?.name ?? 'the other duo';
        try {
          await createNotificationsForDuo(r.requester_duo_id, 'review', {
            plan_id:  r.plan_id,
            duo_name: creatorName,          // shows as "...with <creator duo>?"
            date:     r.plan?.date,
            message:  `How was your hangout with ${creatorName}?`,
          });
          await supabase
            .from('hangout_plan_requests')
            .update({ review_sent_requester: true })
            .eq('id', r.id);
        } catch {
          /* fire-and-forget */
        }
      }
    };

    run();
    const interval = setInterval(run, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);
}
