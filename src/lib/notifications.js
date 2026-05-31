import { supabase } from './supabaseClient.js'

export async function getNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data ?? []
}

export async function markAsRead(notificationId) {
  if (!notificationId) throw new Error('Notification id is required')

  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .select('id')
  if (error) throw error
  if (!data?.length) throw new Error('Notification could not be marked read')
  return data[0]
}

export async function markAllAsRead(userId) {
  if (!userId) throw new Error('User id is required')

  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)
    .select('id')
  if (error) throw error
  return data ?? []
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
  console.log('sendPushForNotification called', notificationId)
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
    console.log('push fetch completed')
  } catch (e) {
    console.warn('Push notification error:', e);
  }
}

export async function createNotificationForUser(userId, type, payload) {
  // No .select()/.single() here: the row's user_id is usually NOT auth.uid()
  // (we notify another user), and the notifications SELECT RLS policy
  // (user_id = auth.uid()) would filter the RETURNING row out, making .single()
  // throw on 0 rows. INSERT itself is allowed (WITH CHECK true), so we just
  // insert and check the error.
  const { error } = await supabase
    .from('notifications')
    .insert({ user_id: userId, type, payload });
  if (error) throw error;

  return { user_id: userId, type, payload };
}

export async function createNotificationsForDuo(duoId, type, payload) {
  const { data: members, error: membersError } = await supabase
    .from('duo_members')
    .select('user_id')
    .eq('duo_id', duoId)
  if (membersError) throw membersError
  if (!members?.length) return

  const { data: inserted, error } = await supabase
    .from('notifications')
    .insert(
      members.map((m) => ({ user_id: m.user_id, type, payload, read: false })),
    )
    .select('id')
  if (error) throw error

  // Fire a push for each recipient (no-op for types the edge function skips).
  // Best-effort: never let a push failure break notification creation.
  await Promise.all(
    (inserted ?? []).map((n) => sendPushForNotification(n.id).catch(() => {})),
  )
}
