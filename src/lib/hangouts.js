import { supabase } from './supabaseClient.js'
import { createNotificationsForDuo } from './notifications.js'

async function assertCanPropose(fromDuoId, toDuoId, proposedBy) {
  if (!fromDuoId || !toDuoId || !proposedBy) throw new Error('Missing required fields for hangout proposal')
  if (fromDuoId === toDuoId) throw new Error('Cannot propose a hangout to your own duo')

  // Proposer must be a member of the source duo.
  const { data: fromMembership } = await supabase
    .from('duo_members')
    .select('duo_id')
    .eq('duo_id', fromDuoId)
    .eq('user_id', proposedBy)
    .maybeSingle()
  if (!fromMembership) throw new Error('You are not a member of the source duo')

  // Proposer must NOT be a member of the target duo.
  const { data: toMembership } = await supabase
    .from('duo_members')
    .select('duo_id')
    .eq('duo_id', toDuoId)
    .eq('user_id', proposedBy)
    .maybeSingle()
  if (toMembership) throw new Error('Cannot propose a hangout to a duo you are already a member of')
}

export async function proposeHangout({ fromDuoId, toDuoId, proposedBy, date, timeSlot, place, vibe, message }) {
  await assertCanPropose(fromDuoId, toDuoId, proposedBy)

  const { data: hangout, error } = await supabase
    .from('hangouts')
    .insert({
      duo_a_id:    fromDuoId,
      duo_b_id:    toDuoId,
      proposed_by: proposedBy,
      date,
      time_slot:   timeSlot,
      place:       place ?? '',
      vibe,
      message:     message ?? '',
      status:      'pending',
    })
    .select()
    .single()

  if (error) throw error

  // Notify the receiving duo
  const { data: fromDuo } = await supabase
    .from('duos').select('name').eq('id', fromDuoId).single()
  await createNotificationsForDuo(toDuoId, 'hangout_request', {
    hangout_id: hangout.id,
    duo_name:   fromDuo?.name ?? 'a duo',
  })

  return hangout
}

// Accepts a single duoId (string) or an array of duoIds.
export async function getMyHangouts(duoIds) {
  const ids = Array.isArray(duoIds) ? duoIds : [duoIds]
  if (ids.length === 0) return []

  const orFilter = ids.map((id) => `duo_a_id.eq.${id},duo_b_id.eq.${id}`).join(',')

  const { data, error } = await supabase
    .from('hangouts')
    .select(`
      *,
      duo_a:duos!hangouts_duo_a_id_fkey(
        id, name, city,
        duo_members(instagram, profiles(name, instagram))
      ),
      duo_b:duos!hangouts_duo_b_id_fkey(
        id, name, city,
        duo_members(instagram, profiles(name, instagram))
      )
    `)
    .or(orFilter)
    .order('created_at', { ascending: false })

  if (error) return []
  return data
}

// Two-person approval for pending hangouts (duo_b must both accept).
// Single-person confirm for countered hangouts (duo_a accepts the counter).
// Returns { confirmed: bool, waitingForPartner: bool }.
export async function acceptHangout(hangoutId, currentUserId) {
  const { data: h } = await supabase
    .from('hangouts')
    .select('duo_a_id, duo_b_id, receiver_accept_user_ids, status')
    .eq('id', hangoutId)
    .single()
  if (!h) throw new Error('Hangout not found')

  // Countered: duo_a is accepting the counter — confirm immediately.
  if (h.status === 'countered') {
    const { error } = await supabase
      .from('hangouts').update({ status: 'confirmed' }).eq('id', hangoutId)
    if (error) throw error

    const { data: duoB } = await supabase.from('duos').select('name').eq('id', h.duo_b_id).single()
    await createNotificationsForDuo(h.duo_a_id, 'hangout_accepted', {
      hangout_id: hangoutId,
      duo_name:   duoB?.name ?? 'a duo',
    })
    return { confirmed: true, waitingForPartner: false }
  }

  // Pending: duo_b requires both members to accept.
  const { data: duoBMembers } = await supabase
    .from('duo_members').select('user_id').eq('duo_id', h.duo_b_id)
  const receiverIds = (duoBMembers ?? []).map((m) => m.user_id)

  const currentAccepts = [...(h.receiver_accept_user_ids ?? [])]
  if (!currentAccepts.includes(currentUserId)) currentAccepts.push(currentUserId)

  const allAccepted = receiverIds.length > 0 && receiverIds.every((id) => currentAccepts.includes(id))

  const updateData = { receiver_accept_user_ids: currentAccepts }
  if (allAccepted) updateData.status = 'confirmed'

  const { error } = await supabase.from('hangouts').update(updateData).eq('id', hangoutId)
  if (error) throw error

  if (allAccepted) {
    const { data: duoB } = await supabase.from('duos').select('name').eq('id', h.duo_b_id).single()
    await createNotificationsForDuo(h.duo_a_id, 'hangout_accepted', {
      hangout_id: hangoutId,
      duo_name:   duoB?.name ?? 'a duo',
    })
  }

  return { confirmed: allAccepted, waitingForPartner: !allAccepted }
}

// Any member of duo_b declining immediately declines the hangout.
export async function declineHangout(hangoutId, currentUserId) {
  const { data: h } = await supabase
    .from('hangouts')
    .select('duo_a_id, duo_b_id, receiver_decline_user_ids')
    .eq('id', hangoutId)
    .single()

  const currentDeclines = [...(h?.receiver_decline_user_ids ?? [])]
  if (currentUserId && !currentDeclines.includes(currentUserId)) {
    currentDeclines.push(currentUserId)
  }

  const { error } = await supabase
    .from('hangouts')
    .update({ receiver_decline_user_ids: currentDeclines, status: 'declined' })
    .eq('id', hangoutId)
  if (error) throw error

  if (h) {
    const { data: duoB } = await supabase.from('duos').select('name').eq('id', h.duo_b_id).single()
    await createNotificationsForDuo(h.duo_a_id, 'hangout_declined', {
      hangout_id: hangoutId,
      duo_name:   duoB?.name ?? 'a duo',
    })
  }
}

export async function counterHangout(hangoutId, newData) {
  const { error } = await supabase
    .from('hangouts')
    .update({
      date:      newData.date,
      time_slot: newData.timeSlot,
      place:     newData.place,
      status:    'countered',
    })
    .eq('id', hangoutId)

  if (error) throw error
}

// Returns pending proposals where duoId is the receiving duo (duo_b).
// Throws on Supabase error so callers can surface it instead of silently showing nothing.
export async function getPendingHangoutsForDuo(duoId) {
  if (!duoId) return []
  const { data, error } = await supabase
    .from('hangouts')
    .select('id, status, vibe, date, time_slot, place, duo_a:duos!hangouts_duo_a_id_fkey(id, name)')
    .eq('duo_b_id', duoId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Could not load hangout proposals: ${error.message}`)
  return data ?? []
}
