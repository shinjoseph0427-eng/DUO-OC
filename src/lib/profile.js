import { requireSupabase } from './supabaseClient.js';

/**
 * NOTE ON TABLE NAMING:
 *
 * auth.users  → managed by Supabase Auth. Do NOT query directly.
 *               Access via supabase.auth.getUser() to get auth.uid().
 *
 * public.users → our app-level profile table.
 *                id = auth.uid() — linked 1:1 to auth.users.
 *
 * public.profiles → extended preferences: vibes, intent, looking_for, etc.
 *                    user_id = auth.uid()
 */

/**
 * Create or update the app profile rows in public.users and public.profiles.
 * Call after signUpWithEmail succeeds.
 *
 * Accepts a nested object:
 *   {
 *     user:    { id, email, first_name, age, city, school, instagram_handle, bio, is_active, verification_level }
 *     profile: { user_id, vibes, intent, looking_for, preferred_cities, availability, safety_status }
 *   }
 *
 * Uses upsert so calling this again (e.g. after re-auth) is safe and idempotent.
 */
export async function createUserProfile({ user, profile }) {
  const sb = requireSupabase();

  // Upsert into public.users — id references auth.users(id)
  const { data: userRow, error: userError } = await sb
    .from('users')
    .upsert(
      {
        id:                  user.id,
        email:               user.email,
        first_name:          user.first_name,
        age:                 user.age,
        city:                user.city,
        school:              user.school ?? null,
        instagram_handle:    user.instagram_handle ?? null,
        bio:                 user.bio ?? null,
        is_active:           user.is_active ?? true,
        verification_level:  user.verification_level ?? 'none',
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (userError) throw userError;

  // Upsert into public.profiles — user_id references public.users(id)
  const { data: profileRow, error: profileError } = await sb
    .from('profiles')
    .upsert(
      {
        user_id:          profile.user_id,
        vibes:            profile.vibes ?? [],
        intent:           profile.intent ?? [],
        looking_for:      profile.looking_for ?? [],
        preferred_cities: profile.preferred_cities ?? [],
        availability:     profile.availability ?? [],
        safety_status:    profile.safety_status ?? 'clear',
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (profileError) throw profileError;

  return { user: userRow, profile: profileRow };
}

/**
 * Fetch the current user's profile in the shape { user, profile }.
 * Returns null if either row is not found (e.g. onboarding not yet complete).
 *
 * @param {string} userId - auth.uid()
 */
export async function getMyProfile(userId) {
  const sb = requireSupabase();

  const { data, error } = await sb
    .from('users')
    .select(`*, profiles (*)`)
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { profiles, ...user } = data;
  return {
    user,
    profile: Array.isArray(profiles) ? profiles[0] ?? null : profiles ?? null,
  };
}

/**
 * Fetch a user's full profile (public.users joined with public.profiles).
 * Returns null if not found.
 *
 * @param {string} userId - auth.uid()
 */
export async function getUserProfile(userId) {
  const sb = requireSupabase();

  const { data, error } = await sb
    .from('users')
    .select(`*, profiles (*)`)
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // row not found
    throw error;
  }

  return data;
}

/**
 * Update fields on public.users for the given user.
 * Optionally also updates public.profiles in the same call.
 *
 * @param {string} userId
 * @param {Object} updates         - fields for public.users
 * @param {Object} [profileUpdates] - fields for public.profiles
 */
export async function updateUserProfile(userId, updates, profileUpdates = null) {
  const sb = requireSupabase();

  const { data, error } = await sb
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;

  if (profileUpdates) {
    const { error: profileError } = await sb
      .from('profiles')
      .update({ ...profileUpdates, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (profileError) throw profileError;
  }

  return data;
}
