import { supabase } from './supabaseClient.js';
import { createNotificationForUser } from './notifications.js';

export async function createInvite(inviterUserId) {
  const { data, error } = await supabase
    .from('duo_invites')
    .insert({ inviter_user_id: inviterUserId })
    .select('token')
    .single();
  if (error) throw error;
  return data.token;
}

export async function getInviteByToken(token) {
  const { data, error } = await supabase
    .from('duo_invites')
    .select('*, profiles!duo_invites_inviter_user_id_fkey(name, photos, city, age)')
    .eq('token', token)
    .eq('status', 'pending')
    .single();
  if (error) return null;
  return data;
}

export async function acceptInvite(token, inviteeUserId) {
  const { data: invite, error: fetchError } = await supabase
    .from('duo_invites')
    .select('id, inviter_user_id')
    .eq('token', token)
    .eq('status', 'pending')
    .single();
  if (fetchError || !invite) throw new Error('Invite not found or already used');

  const inviterProfile = await supabase
    .from('profiles')
    .select('name')
    .eq('id', invite.inviter_user_id)
    .single();

  const inviteeProfile = await supabase
    .from('profiles')
    .select('name')
    .eq('id', inviteeUserId)
    .single();

  const duoName = `${inviterProfile.data?.name ?? 'Duo'} & ${inviteeProfile.data?.name ?? 'You'}`;

  const { data: duo, error: duoError } = await supabase
    .from('duos')
    .insert({
      name: duoName,
      status: 'active',
    })
    .select('id')
    .single();
  if (duoError) throw duoError;

  await supabase.from('duo_members').insert([
    { duo_id: duo.id, user_id: invite.inviter_user_id },
    { duo_id: duo.id, user_id: inviteeUserId },
  ]);

  await supabase
    .from('duo_invites')
    .update({
      status: 'accepted',
      invitee_user_id: inviteeUserId,
      accepted_at: new Date().toISOString(),
    })
    .eq('id', invite.id);

  await createNotificationForUser(
    invite.inviter_user_id,
    'homie_accepted',
    { from_user_id: inviteeUserId }
  );

  return { duo_id: duo.id };
}
