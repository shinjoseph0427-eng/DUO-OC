import { requireSupabase } from './supabaseClient.js';

/**
 * IMPORTANT: Chat threads are created only after a mutual match.
 * A chat_thread row has a match_id foreign key — no match, no thread.
 * Users cannot DM each other before matching.
 *
 * TODO (Phase 13 / RLS):
 * Supabase RLS must verify thread membership before allowing reads or writes.
 * A user can only access a thread if they belong to one of the two matched duos.
 * Without this policy, any authenticated user could read any thread.
 * Membership check: auth.uid() must exist in duo_members for either duo_a_id or duo_b_id
 * of the match linked to this chat_thread.
 */

/**
 * Get all chat threads accessible to a user.
 * Fetches threads where the user is a member of one of the matched duos.
 * Includes last message preview for the chat list UI.
 *
 * @param {string} userId - auth.uid()
 */
export async function getChatThreads(userId) {
  const sb = requireSupabase();

  // Join: duo_members → duos → matches → chat_threads
  // This returns threads where the user is in at least one of the matched duos
  const { data, error } = await sb
    .from('chat_threads')
    .select(`
      id,
      match_id,
      updated_at,
      matches (
        duo_a_id, duo_b_id,
        duo_a:duos!duo_a_id(id, name),
        duo_b:duos!duo_b_id(id, name)
      ),
      chat_messages (
        body, created_at, sender_user_id, is_read
      )
    `)
    .order('updated_at', { ascending: false });

  // TODO: Add .filter() once RLS is in place — RLS will handle membership.
  // For now this returns all threads. Phase 13 adds RLS to lock this down.

  if (error) throw error;
  return data ?? [];
}

/**
 * Get all messages in a thread, ordered oldest → newest.
 *
 * @param {string} threadId
 */
export async function getMessages(threadId) {
  const sb = requireSupabase();

  const { data, error } = await sb
    .from('chat_messages')
    .select(`
      id, body, created_at, is_read, sender_user_id,
      users ( id, first_name, profile_photo_url )
    `)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Send a message into a thread.
 * Caller must pass their own auth.uid() as senderUserId.
 * RLS (Phase 13) will enforce that the sender belongs to the matched duo.
 *
 * @param {string} threadId
 * @param {string} senderUserId - auth.uid()
 * @param {string} body
 */
export async function sendMessage(threadId, senderUserId, body) {
  const sb = requireSupabase();

  if (!body || !body.trim()) throw new Error('Message body cannot be empty.');

  const { data, error } = await sb
    .from('chat_messages')
    .insert({ thread_id: threadId, sender_user_id: senderUserId, body: body.trim() })
    .select()
    .single();

  if (error) throw error;

  // Update thread's updated_at so it floats to top of chat list
  await sb
    .from('chat_threads')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', threadId);

  return data;
}

/**
 * Mark all unread messages in a thread as read for the given user.
 * Only marks messages the user did not send.
 *
 * @param {string} threadId
 * @param {string} userId - auth.uid()
 */
export async function markThreadAsRead(threadId, userId) {
  const sb = requireSupabase();

  const { error } = await sb
    .from('chat_messages')
    .update({ is_read: true })
    .eq('thread_id', threadId)
    .eq('is_read', false)
    .neq('sender_user_id', userId);

  if (error) throw error;
}

/**
 * Subscribe to new messages in a thread (Supabase Realtime).
 * Returns an unsubscribe function — call it in useEffect cleanup.
 *
 * TODO: Enable in Phase 13 when Realtime is configured in Supabase project.
 * Realtime must be turned on for the chat_messages table in the Supabase dashboard.
 *
 * @param {string} threadId
 * @param {function} onMessage - called with each new message row
 */
export function subscribeToMessages(threadId, onMessage) {
  const sb = requireSupabase();

  const channel = sb
    .channel(`chat:${threadId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${threadId}` },
      (payload) => onMessage(payload.new)
    )
    .subscribe();

  return () => sb.removeChannel(channel);
}
