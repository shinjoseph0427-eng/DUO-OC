import { supabase } from './supabaseClient.js'

const PUSH_TITLES = {
  homie_request:    'New duo request',
  homie_accepted:   'Duo request accepted!',
  match:            'New hangout match!',
  hangout_request:  'Hangout request',
  hangout_accepted: 'Hangout confirmed! 🎉',
  hangout_declined: 'Hangout declined',
  plan_request:     'Someone wants to join your plan',
  plan_accepted:    'Plan request accepted',
  plan_declined:    'Plan request declined',
};

const PUSH_BODIES = {
  homie_request:    'Someone wants to be your duo partner.',
  homie_accepted:   'You have a new duo! Go explore.',
  match:            'A new 2v2 hangout is waiting.',
  hangout_request:  'A duo wants to hang with you.',
  hangout_accepted: "It's on! Chat is now open.",
  hangout_declined: 'They passed on this one.',
  plan_request:     'Tap to review the request.',
  plan_accepted:    'Your plan is confirmed!',
  plan_declined:    'They declined your plan request.',
};

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

export async function createNotificationForUser(userId, type, payload) {
  const { data: notif, error } = await supabase
    .from('notifications')
    .insert({ user_id: userId, type, payload })
    .select()
    .single();
  if (error) throw error;

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('fcm_token')
      .eq('id', userId)
      .single();

    if (profile?.fcm_token) {
      const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return notif;

      await fetch(
        `${SUPABASE_URL}/functions/v1/send-push-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey':        SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            token: profile.fcm_token,
            title: PUSH_TITLES[type] ?? 'DUO OC',
            body:  PUSH_BODIES[type] ?? 'You have a new notification.',
            data:  { type, ...payload },
          }),
        }
      );
    }
  } catch (e) {
    console.warn('Push notification error:', e);
  }

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
