import { supabase } from './supabaseClient.js'

export async function proposeHangout(duoAId, duoBId, proposedBy, data) {
  const { data: hangout, error } = await supabase
    .from('hangouts')
    .insert({
      duo_a_id:    duoAId,
      duo_b_id:    duoBId,
      proposed_by: proposedBy,
      date:        data.date,
      time_slot:   data.timeSlot,
      place:       data.place,
      vibe:        data.vibe,
      message:     data.message || '',
      status:      'pending',
    })
    .select()
    .single()

  if (error) throw error
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
  const { error } = await supabase
    .from('hangouts')
    .update({ status: 'confirmed' })
    .eq('id', hangoutId)

  if (error) throw error
}

export async function declineHangout(hangoutId) {
  const { error } = await supabase
    .from('hangouts')
    .update({ status: 'declined' })
    .eq('id', hangoutId)

  if (error) throw error
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
