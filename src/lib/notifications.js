import { supabase } from './supabaseClient.js'

export async function getNotifications(userId) {
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  return data ?? []
}

export async function markAsRead(notificationId) {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
}

export async function markAllAsRead(userId) {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)
}

// currentUserId must match userId — guards against cross-user subscriptions.
export function subscribeNotifications(userId, currentUserId, callback) {
  if (!userId || userId !== currentUserId) return () => {}

  const channel = supabase
    .channel(`notif:${userId}`)
    .on(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => callback(payload.new),
    )
    .subscribe()
  return () => supabase.removeChannel(channel)
}

export async function createNotificationsForDuo(duoId, type, payload) {
  const { data: members } = await supabase
    .from('duo_members')
    .select('user_id')
    .eq('duo_id', duoId)
  if (!members?.length) return

  await supabase.from('notifications').insert(
    members.map((m) => ({ user_id: m.user_id, type, payload, read: false })),
  )
}
