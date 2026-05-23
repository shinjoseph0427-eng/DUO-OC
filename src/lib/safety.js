import { supabase } from './supabaseClient.js'

export async function reportDuo({ reporterUserId, reportedDuoId, reason, detail }) {
  const { error } = await supabase
    .from('reports')
    .insert({
      reporter_user_id: reporterUserId,
      reported_duo_id:  reportedDuoId,
      reason,
      detail: detail || null,
    })
  if (error) throw error
}

export async function blockDuo({ blockerDuoId, blockedDuoId }) {
  const { error } = await supabase
    .from('blocks')
    .upsert(
      { blocker_duo_id: blockerDuoId, blocked_duo_id: blockedDuoId },
      { onConflict: 'blocker_duo_id,blocked_duo_id', ignoreDuplicates: true },
    )
  if (error) throw error
}

export async function getBlockedDuoIds(myDuoId) {
  const { data } = await supabase
    .from('blocks')
    .select('blocked_duo_id')
    .eq('blocker_duo_id', myDuoId)
  return (data ?? []).map((r) => r.blocked_duo_id)
}
