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

export async function sendPushForNotification(notificationId) {
  try {
    const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    await fetch(
      `${SUPABASE_URL}/functions/v1/send-push-notification`,
      {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey':        SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ notificationId }),
      }
    );
  } catch (e) {
    console.warn('Push notification error:', e);
  }
}

export async function createNotificationForUser(userId, type, payload) {
  const { data: notif, error } = await supabase
    .from('notifications')
    .insert({ user_id: userId, type, payload })
    .select()
    .single();
  if (error) throw error;

  await sendPushForNotification(notif.id);

  return notif;
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
