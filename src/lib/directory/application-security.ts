import { z } from 'zod'

export function normalizeWebsite(value: string) {
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`
  const url = new URL(candidate)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.')) throw new Error('Enter a valid website address.')
  url.hash = ''
  return { url: url.toString(), key: url.host.toLowerCase().replace(/^www\./, '') }
}

export const websiteInput = z.string().trim().min(1, 'Add your website.').max(300).refine((value) => {
  try { normalizeWebsite(value); return true } catch { return false }
}, 'Enter a valid website address.')

export function decodeApplicationLogo(logo: { base64: string; type: string }) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(logo.base64)) throw new Error('Use a valid image.')
  const bytes = Uint8Array.from(atob(logo.base64), (character) => character.charCodeAt(0))
  if (bytes.length > 2_000_000) throw new Error('Use a logo under 2 MB.')
  const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 && bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
  const webp = String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  if (!(logo.type === 'image/png' && png || logo.type === 'image/jpeg' && jpeg || logo.type === 'image/webp' && webp)) throw new Error('Use a PNG, JPG or WebP logo.')
  return bytes
}