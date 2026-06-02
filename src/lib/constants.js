// Shared app-wide constants. Single source of truth for values that were
// previously duplicated across lib modules and pages.

// Max message length
export const MAX_MESSAGE_LENGTH = 500

// Max duos per user
export const MAX_DUOS_PER_USER = 3

// Hangout expiry (milliseconds)
export const HANGOUT_EXPIRES_MS = 72 * 60 * 60 * 1000

// Supabase storage base URL
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
