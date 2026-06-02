// src/lib/soloMessages.js
// Solo 1:1 채팅 — duoRoomMessages.js 패턴 복제, match_id 기반.
// 기존 messages.js / duoRoomMessages.js 전혀 수정하지 않음.

import { supabase } from "./supabaseClient.js";

// profiles 표시 필드 — 실제 스키마 (name + photos[]).
const SENDER_FIELDS = "id, username, name, photos";

// ─────────────────────────────────────────────────────────
// 1. 메시지 조회 (오래된 순)
// ─────────────────────────────────────────────────────────
export async function getSoloMessages(matchId, opts = {}) {
  const { limit = 50, before } = opts;

  let query = supabase
    .from("solo_messages")
    .select(`
      id, match_id, sender_user_id, content, created_at,
      sender:profiles!solo_messages_sender_user_id_fkey(${SENDER_FIELDS})
    `)
    .eq("match_id", matchId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (before) query = query.lt("created_at", before);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ─────────────────────────────────────────────────────────
// 2. 메시지 전송
// ─────────────────────────────────────────────────────────
export async function sendSoloMessage(matchId, content) {
  const trimmed = content?.trim();
  if (!trimmed) throw new Error("메시지 내용이 없습니다.");

  const { data: me } = await supabase.auth.getUser();
  const myId = me?.user?.id;
  if (!myId) throw new Error("로그인 필요");

  const { data, error } = await supabase
    .from("solo_messages")
    .insert({ match_id: matchId, sender_user_id: myId, content: trimmed })
    .select(`
      id, match_id, sender_user_id, content, created_at,
      sender:profiles!solo_messages_sender_user_id_fkey(${SENDER_FIELDS})
    `)
    .single();

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────
// 3. Realtime 구독 — cleanup용 함수 반환 (기존 패턴과 일치)
// ─────────────────────────────────────────────────────────
export function subscribeSoloMessages(matchId, onMessage) {
  const channel = supabase
    .channel(`solo_messages:${matchId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "solo_messages",
        filter: `match_id=eq.${matchId}`,
      },
      async (payload) => {
        // realtime payload엔 join이 없어 sender를 별도 조회.
        const { data: sender } = await supabase
          .from("profiles")
          .select(SENDER_FIELDS)
          .eq("id", payload.new.sender_user_id)
          .single();
        onMessage({ ...payload.new, sender });
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// ─────────────────────────────────────────────────────────
// 4. 메시지 삭제 (본인만)
// ─────────────────────────────────────────────────────────
export async function deleteSoloMessage(messageId) {
  const { data: me } = await supabase.auth.getUser();
  const myId = me?.user?.id;

  const { error } = await supabase
    .from("solo_messages")
    .delete()
    .eq("id", messageId)
    .eq("sender_user_id", myId);

  if (error) throw error;
}

// ─────────────────────────────────────────────────────────
// 5. 안 읽은 메시지 수 (뱃지용)
// ─────────────────────────────────────────────────────────
export async function getSoloUnreadCount(matchId, lastReadAt) {
  const { data: me } = await supabase.auth.getUser();
  const myId = me?.user?.id;

  let query = supabase
    .from("solo_messages")
    .select("id", { count: "exact", head: true })
    .eq("match_id", matchId)
    .neq("sender_user_id", myId);

  if (lastReadAt) query = query.gt("created_at", lastReadAt);

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}
