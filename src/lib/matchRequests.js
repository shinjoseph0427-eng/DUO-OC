import { supabase } from './supabaseClient.js';

const DUO_WITH_MEMBERS = `
  id, name, city, vibes,
  duo_members(
    user_id,
    profiles( id, name, instagram )
  )
`.trim();

export async function sendMatchRequest({ fromDuoId, toDuoId, vibe, preferredTime, message }) {
  if (fromDuoId === toDuoId) {
    throw new Error('Cannot send a request to your own duo.');
  }

  const { data: existing, error: checkError } = await supabase
    .from('match_requests')
    .select('id')
    .eq('from_duo_id', fromDuoId)
    .eq('to_duo_id', toDuoId)
    .eq('status', 'pending')
    .maybeSingle();

  if (checkError) throw checkError;
  if (existing) throw new Error('A pending request to this duo already exists.');

  const { data, error } = await supabase
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

export async function getIncomingRequests(duoId) {
  const { data, error } = await supabase
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

export async function getSentRequests(duoId) {
  const { data, error } = await supabase
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

export async function acceptMatchRequest(requestId) {
  const { data: req, error: fetchError } = await supabase
    .from('match_requests')
    .select('id, from_duo_id, to_duo_id, status')
    .eq('id', requestId)
    .single();

  if (fetchError) throw fetchError;
  if (req.status !== 'pending') throw new Error('Request is no longer pending.');

  // Step 1: mark accepted
  const { error: updateError } = await supabase
    .from('match_requests')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', requestId);

  if (updateError) throw updateError;

  // Step 2: create match row — roll back status on failure
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert({
      duo_a_id:   req.from_duo_id,
      duo_b_id:   req.to_duo_id,
      request_id: requestId,
      status:     'active',
    })
    .select('id')
    .single();

  if (matchError) {
    await supabase
      .from('match_requests')
      .update({ status: 'pending', responded_at: null })
      .eq('id', requestId)
      .catch(() => {});
    throw matchError;
  }

  // Step 3: create chat thread — roll back match + status on failure
  const { error: chatError } = await supabase
    .from('chat_threads')
    .insert({ match_id: match.id });

  if (chatError) {
    await Promise.allSettled([
      supabase.from('matches').delete().eq('id', match.id),
      supabase.from('match_requests').update({ status: 'pending', responded_at: null }).eq('id', requestId),
    ]);
    throw chatError;
  }

  return match;
}

export async function declineMatchRequest(requestId) {
  const { error } = await supabase
    .from('match_requests')
    .update({ status: 'rejected', responded_at: new Date().toISOString() })
    .eq('id', requestId);

  if (error) throw error;
}

export async function getMatchById(matchId) {
  const { data, error } = await supabase
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

export async function getMyMatches(duoId) {
  const { data, error } = await supabase
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
