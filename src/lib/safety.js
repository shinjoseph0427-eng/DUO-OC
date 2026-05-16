import { requireSupabase } from './supabaseClient.js';

/**
 * SAFETY IS A CORE PRODUCT FEATURE — not a legal checkbox, not an afterthought.
 *
 * The 2v2 structure (bringing a friend) is the first layer of safety.
 * This module is the second layer: explicit block/report infrastructure.
 *
 * Every function here must be callable from the UI with zero friction.
 * Blocking and reporting must be the easiest actions in the app after matching.
 */

/**
 * Block a user.
 * Blocking is stored bidirectionally at the product level:
 * discovery queries must exclude any user that appears in either direction.
 * The blocks table itself stores one direction — the query handles both.
 *
 * @param {string} blockerUserId - auth.uid() of the user taking action
 * @param {string} blockedUserId - auth.uid() of the user being blocked
 * @param {string} [reason]      - optional short reason (not shown to blocked user)
 */
export async function blockUser(blockerUserId, blockedUserId, reason = null) {
  const sb = requireSupabase();

  if (blockerUserId === blockedUserId) {
    throw new Error('A user cannot block themselves.');
  }

  const { data, error } = await sb
    .from('blocks')
    .insert({ blocker_user_id: blockerUserId, blocked_user_id: blockedUserId, reason })
    .select()
    .single();

  // Ignore unique constraint violation — already blocked is fine
  if (error && error.code !== '23505') throw error;

  return data ?? null;
}

/**
 * Report a user, duo, or match.
 * At least one of reported_user_id, reported_duo_id, or reported_match_id must be provided.
 * Reports are preserved permanently for admin review — never auto-deleted.
 *
 * @param {Object} reportData
 * @param {string} reportData.reporter_user_id
 * @param {string} [reportData.reported_user_id]
 * @param {string} [reportData.reported_duo_id]
 * @param {string} [reportData.reported_match_id]
 * @param {string} reportData.reason      - short category: 'harassment','spam','underage','fake','other'
 * @param {string} [reportData.details]   - optional free-text
 */
export async function reportUser(reportData) {
  const sb = requireSupabase();

  const {
    reporter_user_id,
    reported_user_id = null,
    reported_duo_id = null,
    reported_match_id = null,
    reason,
    details = null,
  } = reportData;

  if (!reported_user_id && !reported_duo_id && !reported_match_id) {
    throw new Error('At least one of reported_user_id, reported_duo_id, or reported_match_id is required.');
  }

  const { data, error } = await sb
    .from('reports')
    .insert({
      reporter_user_id,
      reported_user_id,
      reported_duo_id,
      reported_match_id,
      reason,
      details,
      status: 'open',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get the list of user IDs that the given user has blocked.
 * Use this to filter them out of discovery queries.
 *
 * Also fetches users who have blocked the current user (reverse direction),
 * so discovery is mutually exclusive.
 *
 * @param {string} userId - auth.uid()
 * @returns {string[]} array of user IDs to exclude from discovery
 */
export async function getBlockedUserIds(userId) {
  const sb = requireSupabase();

  const [outgoing, incoming] = await Promise.all([
    // Users this person has blocked
    sb.from('blocks').select('blocked_user_id').eq('blocker_user_id', userId),
    // Users who have blocked this person
    sb.from('blocks').select('blocker_user_id').eq('blocked_user_id', userId),
  ]);

  if (outgoing.error) throw outgoing.error;
  if (incoming.error) throw incoming.error;

  const blocked  = (outgoing.data ?? []).map((r) => r.blocked_user_id);
  const blockers = (incoming.data ?? []).map((r) => r.blocker_user_id);

  return [...new Set([...blocked, ...blockers])];
}
