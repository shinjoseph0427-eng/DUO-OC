import { supabase } from './supabaseClient.js'
import { createNotificationForUser } from './notifications.js'

async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, city, instagram')
    .eq('id', userId)
    .single()

  if (error) return null
  return data
}

async function getActiveDuoMembership(userId) {
  const { data, error } = await supabase
    .from('duo_members')
    .select('id, duo_id, instagram, duos(*, duo_members(user_id))')
    .eq('user_id', userId)

  if (error) throw error
  return (data ?? []).find((membership) => membership.duos?.status === 'active') ?? null
}

async function ensureSenderDuo(senderProfile, receiverProfile) {
  const senderMembership = await getActiveDuoMembership(senderProfile.id)
  if (senderMembership?.duo_id) return senderMembership.duo_id

  const duoName = [senderProfile.name, receiverProfile?.name].filter(Boolean).join(' & ') || 'New Duo'
  const { data: duo, error: duoError } = await supabase
    .from('duos')
    .insert({
      name: duoName,
      city: senderProfile.city ?? receiverProfile?.city ?? null,
      vibes: [],
      spots: [],
      looking_for: 'Hangouts',
      status: 'active',
    })
    .select()
    .single()

  if (duoError) throw duoError

  const { data: existingMember, error: existingError } = await supabase
    .from('duo_members')
    .select('id')
    .eq('duo_id', duo.id)
    .eq('user_id', senderProfile.id)
    .maybeSingle()

  if (existingError) throw existingError

  if (!existingMember) {
    const { error: memberError } = await supabase
      .from('duo_members')
      .insert({
        duo_id: duo.id,
        user_id: senderProfile.id,
        instagram: senderProfile.instagram,
      })

    if (memberError) throw memberError
  }

  return duo.id
}

async function ensureDuoMember(duoId, profile) {
  const { data: existingMember, error: existingError } = await supabase
    .from('duo_members')
    .select('id')
    .eq('duo_id', duoId)
    .eq('user_id', profile.id)
    .maybeSingle()

  if (existingError) throw existingError
  if (existingMember) return existingMember

  const { data, error } = await supabase
    .from('duo_members')
    .insert({
      duo_id: duoId,
      user_id: profile.id,
      instagram: profile.instagram,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

async function deactivateReceiverSoloDuo(receiverMembership, finalDuoId) {
  if (!receiverMembership?.duo_id || receiverMembership.duo_id === finalDuoId) {
    return null
  }

  const memberCount = receiverMembership.duos?.duo_members?.length ?? 0
  if (memberCount > 1) return null

  const { error } = await supabase
    .from('duos')
    .update({ status: 'inactive' })
    .eq('id', receiverMembership.duo_id)

  if (error) throw error
  return receiverMembership.duo_id
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
    throw requestError ?? new Error('Homie request not found')
  }

  const { from_user_id: fromUserId, to_user_id: toUserId } = request
  if (!fromUserId || !toUserId) {
    throw new Error('Homie request is missing sender or receiver')
  }

  const [senderProfile, receiverProfile] = await Promise.all([
    getProfile(fromUserId),
    getProfile(toUserId),
  ])

  if (!senderProfile || !receiverProfile) {
    throw new Error('Could not load homie request profiles')
  }

  const finalDuoId = await ensureSenderDuo(senderProfile, receiverProfile)
  const receiverActiveMembership = await getActiveDuoMembership(toUserId)
  await ensureDuoMember(finalDuoId, receiverProfile)
  const deactivatedDuoId = await deactivateReceiverSoloDuo(receiverActiveMembership, finalDuoId)

  const { data: acceptedRequest, error: acceptError } = await supabase
    .from('homie_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId)
    .select()
    .single()

  if (acceptError) throw acceptError

  await createNotificationForUser(fromUserId, 'homie_accepted', {
    accepted_by_user_id: toUserId,
    accepted_by_name: receiverProfile.name,
    duo_id: finalDuoId,
  })

  return {
    request: acceptedRequest,
    duo_id: finalDuoId,
    deactivated_duo_id: deactivatedDuoId,
  }
}
