// Shared app-wide constants. Single source of truth for values that were
// previously duplicated across lib modules and pages.

// 메시지 최대 길이
export const MAX_MESSAGE_LENGTH = 500

// 듀오 최대 개수
export const MAX_DUOS_PER_USER = 3

// 행아웃 만료 시간 (밀리초)
export const HANGOUT_EXPIRES_MS = 72 * 60 * 60 * 1000

// Supabase 스토리지 베이스 URL
export const STORAGE_BASE_URL = `https://${import.meta.env.VITE_SUPABASE_URL?.split('//')[1]}/storage/v1/object/public`

// Guards against malformed IDs being interpolated into PostgREST .or() filter
// strings (which would otherwise allow filter-syntax injection).
export function assertUUID(value, label = 'value') {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(value)) {
    throw new Error(`[DUO OC] Invalid UUID for ${label}: ${value}`)
  }
}
