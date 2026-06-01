import { supabase } from './supabaseClient.js'
import { sendPushForNotification, createNotificationsForDuo } from './notifications.js'
import { MAX_DUOS_PER_USER, assertUUID } from './constants.js'

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

// eslint-disable-next-line no-unused-vars
export async function findHomies(currentUser, myProfile) {
  // Exclusion set is intentionally minimal: only the user themselves and anyone
  // they are in a block relationship with (either direction). Everyone else is
  // shown — including former homies whose relationship was deleted. We do NOT
  // exclude current homies, pending requests, co-members, or filter by age, so a
  // removed homie always reappears here.
  const { data: blockRows } = await supabase
    .from('user_blocks')
    .select('blocker_id, blocked_id')
    .or(`blocker_id.eq.${currentUser.id},blocked_id.eq.${currentUser.id}`)

  const blockedIds = (blockRows ?? []).map(
    (r) => (r.blocker_id === currentUser.id ? r.blocked_id : r.blocker_id),
  )

  const excluded = new Set([currentUser.id, ...blockedIds].filter(Boolean))

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .neq('id', currentUser.id)
    .limit(100)

  if (error) return []
  return (data ?? []).filter((p) => !excluded.has(p.id))
}

// Returns the user ids of everyone the user is already homies with (accepted
// homie_requests in either direction).
export async function getMyHomieIds(userId) {
  if (!userId) return []
  const { data, error } = await supabase
    .from('homie_requests')
    .select('from_user_id, to_user_id')
    .eq('status', 'accepted')
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
  if (error) return []
  return [...new Set(
    (data ?? []).map((r) => (r.from_user_id === userId ? r.to_user_id : r.from_user_id)),
  )].filter(Boolean)
}

export async function sendHomieRequest(fromUserId, toUserId) {
  assertUUID(fromUserId, 'fromUserId')
  assertUUID(toUserId, 'toUserId')

  // Already homies (either direction)?
  const homieIds = await getMyHomieIds(fromUserId)
  if (homieIds.includes(toUserId)) return { alreadyHomies: true }

  // Pending request already exists in either direction?
  const { data: pendingRows } = await supabase
    .from('homie_requests')
    .select('id')
    .eq('status', 'pending')
    .or(`and(from_user_id.eq.${fromUserId},to_user_id.eq.${toUserId}),and(from_user_id.eq.${toUserId},to_user_id.eq.${fromUserId})`)
    .limit(1)

  if (pendingRows && pendingRows.length > 0) return { alreadySent: true }

  const { data: request, error } = await supabase
    .from('homie_requests')
    .insert({ from_user_id: fromUserId, to_user_id: toUserId })
    .select('id')
    .single()

  if (error) throw error

  const { data: notification, error: notificationError } = await supabase
    .rpc('notify_homie_request', { p_request_id: request.id })
    .single()
  if (notificationError) throwStep('homie request notification failed', notificationError)

  if (notification?.id) await sendPushForNotification(notification.id)

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

  if (senderCount >= MAX_DUOS_PER_USER) throw new Error(`You've reached your ${MAX_DUOS_PER_USER} Duo limit.`)
  if (receiverCount >= MAX_DUOS_PER_USER) throw new Error(`You've reached your ${MAX_DUOS_PER_USER} Duo limit.`)

  const existingDuoId = await findSharedActiveDuo(senderId, receiverId)
  const createdNewDuo = !existingDuoId
  const finalDuoId = existingDuoId ?? await createDuoWithMembers(senderProfile, receiverProfile)

  const { data: acceptedRequest, error: acceptError } = await supabase
    .from('homie_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId)
    .select()
    .single()

  if (acceptError) {
    // Roll back the duo we just created so we don't leave an orphan with no
    // accepted request behind it. (Only if WE created it this call.)
    if (createdNewDuo && finalDuoId) {
      await supabase.from('duo_members').delete().eq('duo_id', finalDuoId)
      await supabase.from('duos').delete().eq('id', finalDuoId)
    }
    throwStep('request update failed', acceptError)
  }

  const { data: acceptNotif, error: notificationError } = await supabase.rpc(
    'notify_homie_request_accepted',
    {
      p_request_id: requestId,
      p_duo_id: finalDuoId,
    },
  )
  if (notificationError) {
    console.error('acceptHomieRequest notification insert failed:', notificationError)
  } else {
    // Fire a push to the requester: "OO accepted your homie request!"
    const notifRow = Array.isArray(acceptNotif) ? acceptNotif[0] : acceptNotif
    if (notifRow?.id) await sendPushForNotification(notifRow.id).catch(() => {})
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

  // Remove the now-orphaned membership rows for the dissolved duo. Done last so
  // the STEP C notifications above (which look up duoId's members) still fire.
  const { error: membersDeleteError } = await supabase
    .from('duo_members')
    .delete()
    .eq('duo_id', duoId);
  if (membersDeleteError) throw membersDeleteError;

  return { success: true };
}
