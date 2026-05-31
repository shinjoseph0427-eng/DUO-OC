import { supabase } from './supabaseClient.js'
import { sendPushForNotification, createNotificationsForDuo } from './notifications.js'

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

  const { error: memberError } = await supabase
    .from('duo_members')
    .insert([
      { duo_id: duo.id, user_id: senderProfile.id, instagram: senderProfile.instagram ?? null },
      { duo_id: duo.id, user_id: receiverProfile.id, instagram: receiverProfile.instagram ?? null },
    ])

  if (memberError) throwStep('duo members insert failed', memberError)

  return duo.id
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
    .select('id, status')
    .eq('from_user_id', fromUserId)
    .eq('to_user_id', toUserId)
    .in('status', ['pending', 'accepted'])
    .maybeSingle()

  if (existing) return { alreadySent: true }

  const { data: request, error } = await supabase
    .from('homie_requests')
    .insert({ from_user_id: fromUserId, to_user_id: toUserId })
    .select('id')
    .single()

  if (error) throw error

  const { data: notification, error: notificationError } = await supabase
    .rpc('notify_homie_request', { p_request_id: request.id })
    .single()
  console.log('notification RPC result', { notification, notificationError })
  if (notificationError) throwStep('homie request notification failed', notificationError)

  if (notification?.id) await sendPushForNotification(notification.id)
  console.log('notification id check', notification?.id)
  console.log('push sent for notification', notification?.id)

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
    .select('to_user_id, status, profiles!homie_requests_to_user_id_fkey(name, city)')
    .eq('from_user_id', userId)
    .in('status', ['pending', 'accepted'])

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

  const { data: acceptedRequest, error: acceptError } = await supabase
    .from('homie_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId)
    .select()
    .single()

  if (acceptError) throwStep('request update failed', acceptError)

  const { error: notificationError } = await supabase.rpc(
    'notify_homie_request_accepted',
    {
      p_request_id: requestId,
      p_duo_id: finalDuoId,
    },
  )
  if (notificationError) {
    console.error('acceptHomieRequest notification insert failed:', notificationError)
  }

  return {
    request: acceptedRequest,
    duo_id: finalDuoId,
  }
}

export async function leaveDuo(duoId) {
  const { data: members, error: memberError } = await supabase
    .from('duo_members')
    .select('user_id')
    .eq('duo_id', duoId);
  if (memberError) throw memberError;

  const { error: duoError } = await supabase
    .from('duos')
    .update({ status: 'dissolved' })
    .eq('id', duoId);
  if (duoError) throw duoError;

  const { error: planError } = await supabase
    .from('hangout_plans')
    .update({ status: 'cancelled' })
    .eq('creator_duo_id', duoId)
    .eq('status', 'open');
  if (planError) throw planError;

  if (members?.length === 2) {
    const [userA, userB] = members.map((member) => member.user_id);
    const { error: homieError } = await supabase
      .from('homie_requests')
      .delete()
      .eq('status', 'accepted')
      .or(
        `and(from_user_id.eq.${userA},to_user_id.eq.${userB}),` +
        `and(from_user_id.eq.${userB},to_user_id.eq.${userA})`,
      );
    if (homieError) throw homieError;
  }

  // Cancel any pending/confirmed hangouts this duo is part of, and notify both
  // sides. Wrapped in try/catch so a failure here never blocks the dissolve.
  // (Setting status = 'cancelled' requires the hangouts_status_check migration
  // that allows the 'cancelled' value; until applied this block no-ops safely.)
  try {
    const { data: liveHangouts } = await supabase
      .from('hangouts')
      .select('id, duo_a_id, duo_b_id, status')
      .or(`duo_a_id.eq.${duoId},duo_b_id.eq.${duoId}`)
      .in('status', ['pending', 'confirmed']);

    if (liveHangouts?.length) {
      // Resolve names for this (leaving) duo and every other duo involved.
      const otherDuoIds = [...new Set(
        liveHangouts.map((h) => (h.duo_a_id === duoId ? h.duo_b_id : h.duo_a_id)),
      )];
      const { data: duoRows } = await supabase
        .from('duos')
        .select('id, name')
        .in('id', [duoId, ...otherDuoIds]);
      const nameById = new Map((duoRows ?? []).map((d) => [d.id, d.name]));
      const leavingDuoName = nameById.get(duoId) ?? 'A duo';

      // STEP A — cancel them all in one update.
      const { error: cancelError } = await supabase
        .from('hangouts')
        .update({ status: 'cancelled' })
        .in('id', liveHangouts.map((h) => h.id));
      if (cancelError) throw cancelError;

      // STEP B & C — notify each side (best-effort; never throws).
      await Promise.all(
        liveHangouts.flatMap((h) => {
          const otherDuoId   = h.duo_a_id === duoId ? h.duo_b_id : h.duo_a_id;
          const otherDuoName = nameById.get(otherDuoId) ?? 'the other duo';
          return [
            // STEP B — the other duo
            createNotificationsForDuo(otherDuoId, 'hangout_cancelled', {
              hangout_id:         h.id,
              cancelled_duo_name: leavingDuoName,
              reason:             'duo_dissolved',
            }).catch(() => {}),
            // STEP C — the leaving (this) duo
            createNotificationsForDuo(duoId, 'hangout_cancelled', {
              hangout_id:     h.id,
              other_duo_name: otherDuoName,
              reason:         'duo_dissolved',
            }).catch(() => {}),
          ];
        }),
      );
    }
  } catch (e) {
    console.warn('leaveDuo: hangout cancellation/notify failed (non-fatal)', e);
  }

  return { success: true };
}
