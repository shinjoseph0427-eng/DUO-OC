import { requireSupabase } from './supabaseClient.js';

// ─── Nested select fragments ───────────────────────────────────────────────────

const DUO_WITH_MEMBERS = `
  id, name, cities, vibes, card_bg,
  duo_members!inner(
    id, status,
    users!inner( id, first_name, instagram_handle )
  )
`.trim();

// ─── Send a 2v2 request ────────────────────────────────────────────────────────

export async function sendMatchRequest({ fromDuoId, toDuoId, vibe, preferredTime, message }) {
  const sb = requireSupabase();

  // Guard: no self-request
  if (fromDuoId === toDuoId) {
    throw new Error('Cannot send a request to your own duo.');
  }

  // Guard: no duplicate pending request
  const { data: existing, error: checkError } = await sb
    .from('match_requests')
    .select('id, status')
    .eq('from_duo_id', fromDuoId)
    .eq('to_duo_id', toDuoId)
    .eq('status', 'pending')
    .maybeSingle();

  if (checkError) throw checkError;
  if (existing) throw new Error('A pending request to this duo already exists.');

  const { data, error } = await sb
    .from('match_requests')
    .insert({
      from_duo_id:    fromDuoId,
      to_duo_id:      toDuoId,
      vibe:           vibe ?? null,
      preferred_time: preferredTime ?? null,
      message:        message?.trim() || null,
      status:         'pending',
    })
    .select('id')
    .single();

  if (error) throw error;
  return data;
}

// ─── Incoming requests for a duo ───────────────────────────────────────────────

export async function getIncomingRequests(duoId) {
  const sb = requireSupabase();

  const { data, error } = await sb
    .from('match_requests')
    .select(`
      id, status, vibe, preferred_time, message, created_at,
      from_duo:from_duo_id( ${DUO_WITH_MEMBERS} )
    `)
    .eq('to_duo_id', duoId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// ─── Requests sent by a duo ────────────────────────────────────────────────────

export async function getSentRequests(duoId) {
  const sb = requireSupabase();

  const { data, error } = await sb
    .from('match_requests')
    .select(`
      id, status, vibe, preferred_time, message, created_at,
      to_duo:to_duo_id( ${DUO_WITH_MEMBERS} )
    `)
    .eq('from_duo_id', duoId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// ─── Accept a request → creates matches row ────────────────────────────────────

export async function acceptMatchRequest(requestId) {
  const sb = requireSupabase();

  // Fetch the request first to get both duo IDs
  const { data: req, error: fetchError } = await sb
    .from('match_requests')
    .select('id, from_duo_id, to_duo_id, status')
    .eq('id', requestId)
    .single();

  if (fetchError) throw fetchError;
  if (req.status !== 'pending') throw new Error('Request is no longer pending.');

  // Update request status
  const { error: updateError } = await sb
    .from('match_requests')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', requestId);

  if (updateError) throw updateError;

  // Insert matches row (requester = duo_a, acceptor = duo_b)
  const { data: match, error: matchError } = await sb
    .from('matches')
    .insert({
      duo_a_id:   req.from_duo_id,
      duo_b_id:   req.to_duo_id,
      request_id: requestId,
      status:     'active',
    })
    .select('id')
    .single();

  if (matchError) throw matchError;
  return match;
}

// ─── Decline a request ─────────────────────────────────────────────────────────

export async function declineMatchRequest(requestId) {
  const sb = requireSupabase();

  const { error } = await sb
    .from('match_requests')
    .update({ status: 'rejected', responded_at: new Date().toISOString() })
    .eq('id', requestId);

  if (error) throw error;
}

// ─── Get a single match with full duo data ─────────────────────────────────────

export async function getMatchById(matchId) {
  const sb = requireSupabase();

  const { data, error } = await sb
    .from('matches')
    .select(`
      id, status, created_at,
      request:request_id( vibe, preferred_time, message ),
      duo_a:duo_a_id( ${DUO_WITH_MEMBERS} ),
      duo_b:duo_b_id( ${DUO_WITH_MEMBERS} )
    `)
    .eq('id', matchId)
    .single();

  if (error) throw error;
  return data;
}

// ─── All active matches for a duo ─────────────────────────────────────────────

export async function getMyMatches(duoId) {
  const sb = requireSupabase();

  const { data, error } = await sb
    .from('matches')
    .select(`
      id, status, created_at,
      request:request_id( vibe, preferred_time, message ),
      duo_a:duo_a_id( ${DUO_WITH_MEMBERS} ),
      duo_b:duo_b_id( ${DUO_WITH_MEMBERS} )
    `)
    .or(`duo_a_id.eq.${duoId},duo_b_id.eq.${duoId}`)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
