import { supabase } from './supabaseClient.js'

const MAX_MESSAGE_LENGTH = 500

// Resolves all caller duo_ids then verifies at least one belongs to the hangout.
async function assertHangoutMember(hangoutId, currentUserId) {
  if (!currentUserId) throw new Error('Unauthorized')

  const { data: memberships } = await supabase
    .from('duo_members')
    .select('duo_id')
    .eq('user_id', currentUserId)

  const duoIds = (memberships ?? []).map((m) => m.duo_id).filter(Boolean)
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
  const { data: memberships } = await supabase
    .from('duo_members')
    .select('duo_id')
    .eq('user_id', userId)

  const duoIds = (memberships ?? []).map((m) => m.duo_id).filter(Boolean)
  if (duoIds.length === 0) return []

  const orFilter = duoIds.map((id) => `duo_a_id.eq.${id},duo_b_id.eq.${id}`).join(',')

  const { data: hangouts, error } = await supabase
    .from('hangouts')
    .select(`
      id, duo_a_id, duo_b_id, created_at,
      duo_a:duos!hangouts_duo_a_id_fkey(
        id, name,
        duo_members(user_id, profiles(name))
      ),
      duo_b:duos!hangouts_duo_b_id_fkey(
        id, name,
        duo_members(user_id, profiles(name))
      )
    `)
    .or(orFilter)
    .eq('status', 'confirmed')
    .order('created_at', { ascending: false })

  if (error || !hangouts) return []

  const results = await Promise.all(
    hangouts.map(async (h) => {
      const otherDuo = duoIds.includes(h.duo_a_id) ? h.duo_b : h.duo_a

      const { data: lastMsg } = await supabase
        .from('messages')
        .select('content, created_at')
        .eq('hangout_id', h.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const members = (otherDuo?.duo_members ?? []).map((m) => ({
        name:      m.profiles?.name ?? 'Member',
        avatarUrl: null,
      }))

      return {
        hangoutId:   h.id,
        otherDuo:    { name: otherDuo?.name ?? 'Duo', members },
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
