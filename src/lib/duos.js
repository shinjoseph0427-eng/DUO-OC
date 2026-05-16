import { requireSupabase } from './supabaseClient.js';

/**
 * Create a new duo.
 * The creator is added to duo_members automatically.
 * Partner can be invited by phone/email — they join later.
 *
 * @param {Object} duoData
 * @param {string} duoData.name
 * @param {string} duoData.creator_user_id   - auth.uid()
 * @param {string} [duoData.bio]
 * @param {string[]} [duoData.shared_vibes]
 * @param {string[]} [duoData.looking_for]
 * @param {string[]} [duoData.preferred_spots]
 * @param {string} [duoData.partner_invite_contact] - phone or email of invited partner
 */
export async function createDuo(duoData) {
  const sb = requireSupabase();

  const {
    name, creator_user_id, bio = '',
    shared_vibes = [], looking_for = [], preferred_spots = [],
    partner_invite_contact = null,
  } = duoData;

  // status is 'pending' until partner joins and duo becomes 'active'
  const { data: duo, error: duoError } = await sb
    .from('duos')
    .insert({
      name, creator_user_id, bio,
      shared_vibes, looking_for, preferred_spots,
      partner_invite_contact,
      status: partner_invite_contact ? 'pending' : 'pending',
    })
    .select()
    .single();

  if (duoError) throw duoError;

  // Add creator as first duo_member
  const { error: memberError } = await sb
    .from('duo_members')
    .insert({ duo_id: duo.id, user_id: creator_user_id, role: 'creator', status: 'active' });

  if (memberError) throw memberError;

  return duo;
}

/**
 * Fetch all active duos for the discovery feed.
 * Does not apply matching score — caller handles ranking.
 * Hard filters (age, blocks) should be added as RLS or query params later.
 */
export async function getActiveDuos() {
  const sb = requireSupabase();

  const { data, error } = await sb
    .from('duos')
    .select(`
      *,
      duo_members (
        user_id, role, status,
        users ( id, first_name, age, city, instagram_handle, profile_photo_url, verification_level )
      )
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Fetch a single duo by ID with full member data.
 * Returns null if not found.
 *
 * @param {string} duoId
 */
export async function getDuoById(duoId) {
  const sb = requireSupabase();

  const { data, error } = await sb
    .from('duos')
    .select(`
      *,
      duo_members (
        user_id, role, status,
        users ( id, first_name, age, city, instagram_handle, profile_photo_url, verification_level )
      )
    `)
    .eq('id', duoId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

/**
 * Update duo fields.
 * Only the duo creator should be allowed to do this (enforced by RLS).
 *
 * @param {string} duoId
 * @param {Object} updates
 */
export async function updateDuo(duoId, updates) {
  const sb = requireSupabase();

  const { data, error } = await sb
    .from('duos')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', duoId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Record an invite to a partner.
 * Does not send a message — caller handles SMS/email delivery separately.
 * Updates duo.partner_invite_contact and duo.status stays 'pending'.
 *
 * @param {string} duoId
 * @param {string} partnerContact - phone number or email
 */
export async function inviteDuoPartner(duoId, partnerContact) {
  const sb = requireSupabase();

  const { data, error } = await sb
    .from('duos')
    .update({
      partner_invite_contact: partnerContact,
      updated_at: new Date().toISOString(),
    })
    .eq('id', duoId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all duos a user belongs to (via duo_members).
 * Returns full duo rows with nested member + user data.
 *
 * @param {string} userId
 */
export async function getMyDuos(userId) {
  const sb = requireSupabase();

  const { data: memberships, error: memberError } = await sb
    .from('duo_members')
    .select('duo_id')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (memberError) throw memberError;
  if (!memberships?.length) return [];

  const duoIds = memberships.map((m) => m.duo_id);

  const { data, error } = await sb
    .from('duos')
    .select(`
      *,
      duo_members (
        user_id, role, status,
        users ( id, first_name, age, city, instagram_handle, verification_level )
      )
    `)
    .in('id', duoIds)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Get the most recently created active or pending duo for a user.
 * Returns null if the user has no duo.
 *
 * @param {string} userId
 */
export async function getMyActiveDuo(userId) {
  const duos = await getMyDuos(userId);
  return duos.find((d) => d.status === 'active' || d.status === 'pending') ?? null;
}

/**
 * Create a new duo and add the creator as first member.
 * Wrapper used by onboarding — replaces calling createDuo directly.
 *
 * @param {{ duo: Object, creatorUserId: string }} params
 */
export async function createDuoWithMember({ duo, creatorUserId }) {
  const sb = requireSupabase();

  const {
    name, bio = '',
    shared_vibes = [], looking_for = [], preferred_spots = [],
    partner_invite_contact = null,
  } = duo;

  const { data: duoRow, error: duoError } = await sb
    .from('duos')
    .insert({
      name,
      creator_user_id: creatorUserId,
      bio,
      shared_vibes,
      looking_for,
      preferred_spots,
      partner_invite_contact,
      status: 'pending',
    })
    .select()
    .single();

  if (duoError) throw duoError;

  const { error: memberError } = await sb
    .from('duo_members')
    .insert({ duo_id: duoRow.id, user_id: creatorUserId, role: 'creator', status: 'active' });

  if (memberError) throw memberError;

  return duoRow;
}

/**
 * Join a duo as partner via invite link.
 * Sets duo.partner_user_id, adds member row, activates duo.
 *
 * @param {{ duoId: string, userId: string }} params
 */
export async function joinDuoByInvite({ duoId, userId }) {
  const sb = requireSupabase();

  const { data: duoRow, error: updateError } = await sb
    .from('duos')
    .update({ partner_user_id: userId, status: 'active', updated_at: new Date().toISOString() })
    .eq('id', duoId)
    .select()
    .single();

  if (updateError) throw updateError;

  const { error: memberError } = await sb
    .from('duo_members')
    .insert({ duo_id: duoId, user_id: userId, role: 'partner', status: 'active' });

  if (memberError) throw memberError;

  return duoRow;
}

/**
 * Pause a duo (hide from discovery feed, no new requests).
 * @param {string} duoId
 */
export async function pauseDuo(duoId) {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('duos')
    .update({ status: 'paused', updated_at: new Date().toISOString() })
    .eq('id', duoId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Archive a duo permanently.
 * @param {string} duoId
 */
export async function archiveDuo(duoId) {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('duos')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', duoId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Accept a duo invite — called when the invited partner signs up via invite link.
 * Sets duo.partner_user_id, adds partner to duo_members, and activates the duo.
 *
 * @param {string} duoId
 * @param {string} partnerUserId - auth.uid() of the partner
 */
export async function acceptDuoInvite(duoId, partnerUserId) {
  const sb = requireSupabase();

  const { data: duo, error: updateError } = await sb
    .from('duos')
    .update({
      partner_user_id: partnerUserId,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', duoId)
    .select()
    .single();

  if (updateError) throw updateError;

  const { error: memberError } = await sb
    .from('duo_members')
    .insert({ duo_id: duoId, user_id: partnerUserId, role: 'partner', status: 'active' });

  if (memberError) throw memberError;

  return duo;
}
