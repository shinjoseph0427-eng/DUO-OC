import { requireSupabase } from './supabaseClient.js';

/**
 * Send a 2v2 match request from one duo to another.
 *
 * @param {Object} requestData
 * @param {string} requestData.from_duo_id
 * @param {string} requestData.to_duo_id
 * @param {string} requestData.vibe
 * @param {string} requestData.preferred_time
 * @param {string} [requestData.message]
 */
export async function sendMatchRequest(requestData) {
  const sb = requireSupabase();

  const { from_duo_id, to_duo_id, vibe, preferred_time, message = '' } = requestData;

  if (from_duo_id === to_duo_id) {
    throw new Error('A duo cannot request itself.');
  }

  const { data, error } = await sb
    .from('match_requests')
    .insert({ from_duo_id, to_duo_id, vibe, preferred_time, message, status: 'pending' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get pending requests sent TO a duo (incoming).
 *
 * @param {string} duoId
 */
export async function getIncomingRequests(duoId) {
  const sb = requireSupabase();

  const { data, error } = await sb
    .from('match_requests')
    .select(`*, from_duo:duos!from_duo_id(*)`)
    .eq('to_duo_id', duoId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Get requests sent FROM a duo (outgoing).
 *
 * @param {string} duoId
 */
export async function getOutgoingRequests(duoId) {
  const sb = requireSupabase();

  const { data, error } = await sb
    .from('match_requests')
    .select(`*, to_duo:duos!to_duo_id(*)`)
    .eq('from_duo_id', duoId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Accept an incoming match request.
 *
 * TODO: This should be an atomic database transaction / Supabase RPC function.
 *       Currently two separate writes — if the second fails, state is inconsistent.
 *       In Phase 13: create a Supabase Edge Function or PostgreSQL function that
 *       wraps both writes in a single transaction.
 *
 * Steps:
 *   1. Update match_requests.status → 'accepted'
 *   2. Insert row into matches
 *   3. Insert row into chat_threads (handled by DB trigger or Phase 13)
 *
 * @param {string} requestId
 */
export async function acceptMatchRequest(requestId) {
  const sb = requireSupabase();

  // Step 1: Mark request as accepted
  const { data: request, error: reqError } = await sb
    .from('match_requests')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', requestId)
    .select()
    .single();

  if (reqError) throw reqError;

  // Step 2: Create match record
  const { data: match, error: matchError } = await sb
    .from('matches')
    .insert({
      duo_a_id: request.from_duo_id,
      duo_b_id: request.to_duo_id,
      request_id: requestId,
      status: 'active',
      matched_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (matchError) throw matchError;

  // Step 3: Create chat thread
  // TODO: Move to DB trigger in Phase 13 to make this atomic
  const { error: chatError } = await sb
    .from('chat_threads')
    .insert({ match_id: match.id });

  if (chatError) throw chatError;

  return match;
}

/**
 * Reject an incoming match request.
 *
 * @param {string} requestId
 */
export async function rejectMatchRequest(requestId) {
  const sb = requireSupabase();

  const { data, error } = await sb
    .from('match_requests')
    .update({ status: 'rejected', responded_at: new Date().toISOString() })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all active matches for a duo.
 * Includes the other duo's basic info and the related chat thread.
 *
 * @param {string} duoId
 */
export async function getMatchesForDuo(duoId) {
  const sb = requireSupabase();

  const { data, error } = await sb
    .from('matches')
    .select(`
      *,
      duo_a:duos!duo_a_id(*),
      duo_b:duos!duo_b_id(*),
      chat_threads(id)
    `)
    .or(`duo_a_id.eq.${duoId},duo_b_id.eq.${duoId}`)
    .eq('status', 'active')
    .order('matched_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
