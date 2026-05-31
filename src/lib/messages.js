import { supabase } from './supabaseClient.js'
import { MAX_MESSAGE_LENGTH } from './constants.js'
import { getMyDuoIds } from './duos.js'

// Maps a duo's embedded duo_members rows to the lightweight member shape the
// chat/room UIs consume. Shared by getMyChats and getMyDuoRooms.
function mapDuoMembers(members) {
  return (members ?? []).map((m) => ({
    userId:    m.user_id ?? null,
    name:      m.profiles?.name ?? 'Member',
    avatarUrl: m.profiles?.photos?.[0] ?? null,
  }))
}

// Resolves all caller duo_ids then verifies at least one belongs to the hangout.
async function assertHangoutMember(hangoutId, currentUserId) {
  if (!currentUserId) throw new Error('Unauthorized')

  const duoIds = await getMyDuoIds(currentUserId)
  if (duoIds.length === 0) throw new Error('Unauthorized')

  const { data: hangout, error } = await supabase
    .from('hangouts')
    .select('duo_a_id, duo_b_id')
    .eq('id', hangoutId)
    .single()
  if (error || !hangout) throw new Error('Unauthorized')
  if (!duoIds.includes(hangout.duo_a_id) && !duoIds.includes(hangout.duo_b_id)) {
    throw new Error('Unauthorized')
  }
}

export async function getMyChats(userId) {
  const duoIds = await getMyDuoIds(userId)
  if (duoIds.length === 0) return []

  const orFilter = duoIds.map((id) => `duo_a_id.eq.${id},duo_b_id.eq.${id}`).join(',')

  const { data: hangouts, error } = await supabase
    .from('hangouts')
    .select(`
      id, duo_a_id, duo_b_id, vibe, date, time_slot, place, created_at,
      duo_a:duos!hangouts_duo_a_id_fkey(
        id, name, status,
        duo_members(user_id, profiles(name, photos))
      ),
      duo_b:duos!hangouts_duo_b_id_fkey(
        id, name, status,
        duo_members(user_id, profiles(name, photos))
      )
    `)
    .or(orFilter)
    .eq('status', 'confirmed')
    .order('created_at', { ascending: false })

  if (error || !hangouts) return []

  const results = await Promise.all(
    hangouts.map(async (h) => {
      const myDuoId  = duoIds.find((id) => id === h.duo_a_id || id === h.duo_b_id) ?? duoIds[0]
      const otherDuo = myDuoId === h.duo_a_id ? h.duo_b : h.duo_a

      let lastMsg = null
      try {
        const { data, error: lastMsgError } = await supabase
          .from('messages')
          .select('content, created_at')
          .eq('hangout_id', h.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (!lastMsgError) lastMsg = data
      } catch {
        lastMsg = null
      }

      return {
        hangoutId:   h.id,
        myDuoId,
        duoA:        { id: h.duo_a?.id, name: h.duo_a?.name ?? 'Duo', status: h.duo_a?.status, members: mapDuoMembers(h.duo_a?.duo_members) },
        duoB:        { id: h.duo_b?.id, name: h.duo_b?.name ?? 'Duo', status: h.duo_b?.status, members: mapDuoMembers(h.duo_b?.duo_members) },
        otherDuo:    { name: otherDuo?.name ?? 'Duo', members: mapDuoMembers(otherDuo?.duo_members) },
        vibe:        h.vibe ?? null,
        date:        h.date ?? null,
        timeSlot:    h.time_slot ?? null,
        place:       h.place ?? null,
        lastMessage: lastMsg?.content ?? null,
        updatedAt:   lastMsg?.created_at ?? h.created_at,
      }
    })
  )

  return results
}

export async function getMessages(hangoutId, currentUserId) {
  await assertHangoutMember(hangoutId, currentUserId)

  const { data, error } = await supabase
    .from('messages')
    .select('id, hangout_id, sender_duo_id, sender_user_id, content, created_at')
    .eq('hangout_id', hangoutId)
    .order('created_at', { ascending: true })

  if (error) return []
  return data
}

export async function sendMessage({ hangoutId, senderDuoId, senderUserId, content }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (user.id !== senderUserId) throw new Error('Not authorized')

  await assertHangoutMember(hangoutId, senderUserId)

  const text = content?.trim() ?? ''
  if (!text) throw new Error('Message cannot be empty')
  if (text.length > MAX_MESSAGE_LENGTH) throw new Error(`Message must be ${MAX_MESSAGE_LENGTH} characters or less`)

  const { data, error } = await supabase
    .from('messages')
    .insert({
      hangout_id:     hangoutId,
      sender_duo_id:  senderDuoId,
      sender_user_id: senderUserId,
      content:        text,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Returns a Promise<unsubscribe fn>. Resolves null if membership check fails.
// Lightweight count of confirmed hangout chats for the nav badge.
export async function getConfirmedChatCount(userId) {
  if (!userId) return 0
  const duoIds = await getMyDuoIds(userId)
  if (duoIds.length === 0) return 0
  const orFilter = duoIds.map((id) => `duo_a_id.eq.${id},duo_b_id.eq.${id}`).join(',')
  const { count } = await supabase
    .from('hangouts')
    .select('id', { count: 'exact', head: true })
    .or(orFilter)
    .eq('status', 'confirmed')
  return count ?? 0
}

export async function getMyDuoRooms(userId) {
  const duoIds = await getMyDuoIds(userId)
  if (duoIds.length === 0) return []

  const { data: duos } = await supabase
    .from('duos')
    .select('id, name, status, duo_members(user_id, profiles(name, photos))')
    .in('id', duoIds)
    .eq('status', 'active')

  if (!duos || duos.length === 0) return []

  const results = await Promise.all(
    duos.map(async (duo) => {
      let lastMsg = null;
      try {
        const { data } = await supabase
          .from('duo_messages')
          .select('content, created_at')
          .eq('duo_id', duo.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        lastMsg = data;
      } catch {
        // duo_messages query failed; room still renders without last message
      }

      const members = mapDuoMembers(duo.duo_members)

      return {
        duoId:       duo.id,
        duoName:     duo.name ?? 'My Duo',
        members,
        lastMessage: lastMsg?.content ?? null,
        updatedAt:   lastMsg?.created_at ?? null,
      }
    })
  )

  return results
}

export async function getMyHomieRooms(userId) {
  if (!userId) return []

  const { data, error } = await supabase
    .from('homie_requests')
    .select(`
      id, from_user_id, to_user_id, status, created_at,
      from_profile:profiles!homie_requests_from_user_id_fkey(id, name, photos, city),
      to_profile:profiles!homie_requests_to_user_id_fkey(id, name, photos, city)
    `)
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data.map((request) => {
    const otherProfile = request.from_user_id === userId ? request.to_profile : request.from_profile
    const mineProfile = request.from_user_id === userId ? request.from_profile : request.to_profile
    return {
      roomId:      request.id,
      homieId:     otherProfile?.id ?? null,
      homieName:   otherProfile?.name ?? 'Homie',
      profile:     otherProfile ?? null,
      members:     [
        {
          userId,
          name:      mineProfile?.name ?? 'You',
          avatarUrl: mineProfile?.photos?.[0] ?? null,
        },
        {
          userId:    otherProfile?.id ?? null,
          name:      otherProfile?.name ?? 'Homie',
          avatarUrl: otherProfile?.photos?.[0] ?? null,
        },
      ],
      lastMessage: null,
      updatedAt:   request.created_at,
    }
  })
}

export async function subscribeMessages(hangoutId, currentUserId, callback) {
  try {
    await assertHangoutMember(hangoutId, currentUserId)
  } catch {
    return null
  }

  const channel = supabase
    .channel(`messages:${hangoutId}`)
    .on(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'messages',
        filter: `hangout_id=eq.${hangoutId}`,
      },
      (payload) => callback(payload.new),
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}
