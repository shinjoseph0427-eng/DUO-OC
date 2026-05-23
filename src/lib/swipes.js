import { supabase } from './supabaseClient.js'
import { createNotificationsForDuo } from './notifications.js'

export async function recordSwipe({ fromDuoId, toDuoId, direction }) {
  if (!fromDuoId || !toDuoId) throw new Error('Duo IDs are required')
  if (fromDuoId === toDuoId) throw new Error('Cannot swipe on your own duo')

  const { error: swipeErr } = await supabase
    .from('swipes')
    .insert({ from_duo_id: fromDuoId, to_duo_id: toDuoId, direction })
  if (swipeErr) {
    if (swipeErr.code === '23505') return { matched: false, duplicate: true }
    throw swipeErr
  }

  if (direction !== 'like') return { matched: false }

  // Check if the other duo already liked us back
  const { data: mutual } = await supabase
    .from('swipes')
    .select('id')
    .eq('from_duo_id', toDuoId)
    .eq('to_duo_id', fromDuoId)
    .eq('direction', 'like')
    .limit(1)

  if (!mutual?.length) return { matched: false }

  // Create match row (smaller uuid goes in duo_a for dedup)
  const [duoA, duoB] = [fromDuoId, toDuoId].sort()
  await supabase
    .from('matches')
    .upsert({ duo_a_id: duoA, duo_b_id: duoB }, { onConflict: 'duo_a_id,duo_b_id', ignoreDuplicates: true })

  // Fetch duo names for notification payloads
  const { data: duos } = await supabase
    .from('duos')
    .select('id, name')
    .in('id', [fromDuoId, toDuoId])

  const fromDuo = duos?.find((d) => d.id === fromDuoId)
  const toDuo   = duos?.find((d) => d.id === toDuoId)

  await Promise.all([
    createNotificationsForDuo(fromDuoId, 'match', {
      matched_duo_id:   toDuoId,
      matched_duo_name: toDuo?.name ?? 'a duo',
    }),
    createNotificationsForDuo(toDuoId, 'match', {
      matched_duo_id:   fromDuoId,
      matched_duo_name: fromDuo?.name ?? 'a duo',
    }),
  ])

  return { matched: true, matchedDuo: toDuo ?? { id: toDuoId, name: 'a duo' } }
}

export async function getSwipedDuoIds(myDuoId) {
  const { data } = await supabase
    .from('swipes')
    .select('to_duo_id')
    .eq('from_duo_id', myDuoId)
  return (data ?? []).map((r) => r.to_duo_id)
}
