import { supabase } from './supabaseClient.js'

const MAX_MESSAGE_LENGTH = 500

async function assertDuoMember(duoId, currentUserId) {
  if (!duoId || !currentUserId) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('duo_members')
    .select('duo_id, duos(status)')
    .eq('duo_id', duoId)
    .eq('user_id', currentUserId)
    .maybeSingle()

  if (error || !data || data.duos?.status !== 'active') {
    throw new Error('Unauthorized')
  }
}

export async function getDuoMessages(duoId, currentUserId) {
  await assertDuoMember(duoId, currentUserId)

  const { data, error } = await supabase
    .from('duo_messages')
    .select('id, duo_id, sender_user_id, content, created_at, profiles(name, avatar_url)')
    .eq('duo_id', duoId)
    .order('created_at', { ascending: true })

  if (error) return []
  return data ?? []
}

export async function sendDuoMessage({ duoId, senderUserId, content }) {
  await assertDuoMember(duoId, senderUserId)

  const text = content?.trim() ?? ''
  if (!text) throw new Error('Message cannot be empty')
  if (text.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Message must be ${MAX_MESSAGE_LENGTH} characters or less`)
  }

  const { data, error } = await supabase
    .from('duo_messages')
    .insert({
      duo_id: duoId,
      sender_user_id: senderUserId,
      content: text,
    })
    .select('id, duo_id, sender_user_id, content, created_at, profiles(name, avatar_url)')
    .single()

  if (error) throw error
  return data
}

export async function subscribeDuoMessages(duoId, currentUserId, callback) {
  try {
    await assertDuoMember(duoId, currentUserId)
  } catch {
    return null
  }

  const channel = supabase
    .channel(`duo_messages:${duoId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'duo_messages',
        filter: `duo_id=eq.${duoId}`,
      },
      (payload) => callback(payload.new),
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}
