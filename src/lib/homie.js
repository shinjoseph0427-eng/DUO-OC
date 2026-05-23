import { supabase } from './supabaseClient.js'
import { createNotificationForUser } from './notifications.js'

export async function findHomies(currentUser, myProfile) {
  let query = supabase
    .from('profiles')
    .select('*')
    .neq('id', currentUser.id)

  if (myProfile.age) {
    query = query
      .gte('age', myProfile.age - 3)
      .lte('age', myProfile.age + 3)
  }

  const { data, error } = await query.limit(20)
  if (error) return []
  return data
}

export async function sendHomieRequest(fromUserId, toUserId) {
  const { data: existing } = await supabase
    .from('homie_requests')
    .select('id')
    .eq('from_user_id', fromUserId)
    .eq('to_user_id', toUserId)
    .single()

  if (existing) return { alreadySent: true }

  const { error } = await supabase
    .from('homie_requests')
    .insert({ from_user_id: fromUserId, to_user_id: toUserId })

  if (error) throw error

  await createNotificationForUser(toUserId, 'homie_request', {
    from_user_id: fromUserId,
  })

  return { success: true }
}

export async function getMyHomieRequests(userId) {
  const { data, error } = await supabase
    .from('homie_requests')
    .select('*, profiles!homie_requests_from_user_id_fkey(*)')
    .eq('to_user_id', userId)
    .eq('status', 'pending')

  if (error) return []
  return data
}

export async function acceptHomieRequest(requestId) {
  const { error } = await supabase
    .from('homie_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId)

  if (error) throw error
}
