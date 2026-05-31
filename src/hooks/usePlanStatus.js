import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { isPastHangoutTime } from '../lib/hangouts.js';

// Marks the signed-in user's open/matched plans as 'past' once their scheduled
// date+time has elapsed. Runs on mount and every 60s. Scoped to the user's own
// duos because RLS only allows them to update their own plans.
export function usePlanStatus() {
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

      const { data: plans } = await supabase
        .from('hangout_plans')
        .select('id, date, time_slot, created_at')
        .in('creator_duo_id', duoIds)
        .in('status', ['open', 'matched']);

      for (const p of plans ?? []) {
        if (cancelled) return;
        if (isPastHangoutTime(p.date, p.time_slot, p.created_at)) {
          await supabase
            .from('hangout_plans')
            .update({ status: 'past' })
            .eq('id', p.id);
        }
      }
    };

    run();
    const interval = setInterval(run, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);
}
