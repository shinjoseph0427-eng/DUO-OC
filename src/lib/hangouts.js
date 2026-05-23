import { supabase } from './supabaseClient.js'
import { createNotificationsForDuo } from './notifications.js'

export async function proposeHangout({ fromDuoId, toDuoId, proposedBy, date, timeSlot, place, vibe, message }) {
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

export async function getMyHangouts(duoId) {
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
    .or(`duo_a_id.eq.${duoId},duo_b_id.eq.${duoId}`)
    .order('created_at', { ascending: false })

  if (error) return []
  return data
}

export async function acceptHangout(hangoutId) {
  const { data: h } = await supabase
    .from('hangouts').select('duo_a_id, duo_b_id').eq('id', hangoutId).single()

  const { error } = await supabase
    .from('hangouts').update({ status: 'confirmed' }).eq('id', hangoutId)
  if (error) throw error

  if (h) {
    const { data: duoB } = await supabase
      .from('duos').select('name').eq('id', h.duo_b_id).single()
    await createNotificationsForDuo(h.duo_a_id, 'hangout_accepted', {
      hangout_id: hangoutId,
      duo_name:   duoB?.name ?? 'a duo',
    })
  }
}

export async function declineHangout(hangoutId) {
  const { data: h } = await supabase
    .from('hangouts').select('duo_a_id, duo_b_id').eq('id', hangoutId).single()

  const { error } = await supabase
    .from('hangouts').update({ status: 'declined' }).eq('id', hangoutId)
  if (error) throw error

  if (h) {
    const { data: duoB } = await supabase
      .from('duos').select('name').eq('id', h.duo_b_id).single()
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
