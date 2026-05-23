import { supabase } from './supabaseClient.js'
import { createNotificationForUser } from './notifications.js'

function throwStep(message, error) {
  const detail = error?.message ?? error?.details ?? error?.hint ?? null
  throw new Error(detail ? `${message}: ${detail}` : message)
}

async function getProfile(userId, label) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, city, instagram')
    .eq('id', userId)
    .single()

  if (error) throwStep(`${label} profile load failed`, error)
  return data
}

async function countActiveDuos(userId) {
  const { data, error } = await supabase
    .from('duo_members')
    .select('duo_id, duos!inner(status)')
    .eq('user_id', userId)
    .eq('duos.status', 'active')

  if (error) throwStep('active duo count failed', error)
  return (data ?? []).length
}

async function findSharedActiveDuo(senderUserId, receiverUserId) {
  const { data, error } = await supabase
    .from('duo_members')
    .select('duo_id, duos!inner(status)')
    .eq('user_id', senderUserId)
    .eq('duos.status', 'active')

  if (error) throwStep('shared duo lookup failed', error)
  const senderDuoIds = (data ?? []).map((m) => m.duo_id)
  if (senderDuoIds.length === 0) return null

  const { data: receiverData, error: receiverError } = await supabase
    .from('duo_members')
    .select('duo_id')
    .eq('user_id', receiverUserId)
    .in('duo_id', senderDuoIds)

  if (receiverError) throwStep('shared duo receiver check failed', receiverError)
  return (receiverData ?? [])[0]?.duo_id ?? null
}

async function createDuoWithMembers(senderProfile, receiverProfile) {
  const duoName = [senderProfile.name, receiverProfile.name].filter(Boolean).join(' & ') || 'New Duo'
  const city = receiverProfile.city ?? senderProfile.city ?? null

  const { data: duo, error: duoError } = await supabase
    .from('duos')
    .insert({
      name: duoName,
      city,
      vibes: [],
      spots: [],
      looking_for: 'Hangouts',
      status: 'active',
    })
    .select()
    .single()

  if (duoError) throwStep('duo create failed', duoError)
  console.log('[acceptHomieRequest] created duo_id', duo.id)

  const { error: memberError } = await supabase
    .from('duo_members')
    .insert([
      { duo_id: duo.id, user_id: senderProfile.id, instagram: senderProfile.instagram ?? null },
      { duo_id: duo.id, user_id: receiverProfile.id, instagram: receiverProfile.instagram ?? null },
    ])

  if (memberError) throwStep('duo members insert failed', memberError)
  console.log('[acceptHomieRequest] inserted duo_members for', senderProfile.id, receiverProfile.id)

  return duo.id
}

async function notifyHomieAccepted(fromUserId, payload) {
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: fromUserId,
      type: 'homie_accepted',
      payload,
    })

  if (error) {
    console.error('acceptHomieRequest notification insert failed:', error)
  }
}

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

export async function getSentHomieRequests(userId) {
  const { data, error } = await supabase
    .from('homie_requests')
    .select('to_user_id, status')
    .eq('from_user_id', userId)

  if (error) return []
  return data
}

export async function acceptHomieRequest(requestId) {
  const { data: request, error: requestError } = await supabase
    .from('homie_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (requestError || !request) {
    throwStep('request load failed', requestError ?? new Error('Homie request not found'))
  }

  const { from_user_id: senderId, to_user_id: receiverId } = request
  if (!senderId || !receiverId) {
    throw new Error('Homie request is missing sender or receiver')
  }

  const [senderProfile, receiverProfile] = await Promise.all([
    getProfile(senderId, 'sender'),
    getProfile(receiverId, 'receiver'),
  ])

  if (!senderProfile || !receiverProfile) {
    throw new Error('profiles load failed')
  }

  const [senderCount, receiverCount] = await Promise.all([
    countActiveDuos(senderId),
    countActiveDuos(receiverId),
  ])

  if (senderCount >= 3) throw new Error("You've reached your 3 Duo limit.")
  if (receiverCount >= 3) throw new Error("You've reached your 3 Duo limit.")

  const existingDuoId = await findSharedActiveDuo(senderId, receiverId)
  const finalDuoId = existingDuoId ?? await createDuoWithMembers(senderProfile, receiverProfile)
  console.log('[acceptHomieRequest] finalDuoId', finalDuoId, existingDuoId ? '(existing)' : '(new)')

  const { data: acceptedRequest, error: acceptError } = await supabase
    .from('homie_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId)
    .select()
    .single()

  if (acceptError) throwStep('request update failed', acceptError)

  await notifyHomieAccepted(senderId, {
    accepted_by_user_id: receiverId,
    accepted_by_name: receiverProfile.name,
    duo_id: finalDuoId,
  })

  return {
    request: acceptedRequest,
    duo_id: finalDuoId,
  }
}
