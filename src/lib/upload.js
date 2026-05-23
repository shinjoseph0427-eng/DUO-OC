import { supabase } from './supabaseClient.js'

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])
const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const IMAGE_TYPE_ERROR = 'Only JPG, PNG, WEBP, or GIF images are allowed.'
const IMAGE_SIZE_ERROR = 'Image must be under 5MB.'

function validateImageFile(file) {
  const ext = file?.name?.split('.').pop()?.toLowerCase() ?? ''

  if (!file || !ALLOWED_IMAGE_TYPES.has(file.type) || !ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(IMAGE_TYPE_ERROR)
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(IMAGE_SIZE_ERROR)
  }

  return ext === 'jpeg' ? 'jpg' : ext
}

export async function uploadPhoto(userId, file) {
  const ext = validateImageFile(file)

  const path = `${userId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { contentType: file.type })

  if (error) throw error

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}

export async function deletePhoto(url) {
  const marker = '/avatars/'
  const idx = url.indexOf(marker)
  if (idx === -1) return
  const path = decodeURIComponent(url.slice(idx + marker.length).split('?')[0])
  await supabase.storage.from('avatars').remove([path])
}
