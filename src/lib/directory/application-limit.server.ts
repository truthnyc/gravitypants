import { getRequestHeader } from '@tanstack/react-start/server'
import { supabaseAdmin } from '@/integrations/supabase/client.server'

export async function allowBrandRequest() {
  const ip = getRequestHeader('cf-connecting-ip') ?? getRequestHeader('x-real-ip') ?? getRequestHeader('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const salt = process.env['LOVABLE_API_KEY']
  if (!salt) throw new Error('Submission protection unavailable')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:brand-request:${ip}`))
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  const { data, error } = await supabaseAdmin.rpc('consume_brand_request_limit', { _visitor_hash: hash })
  if (error) throw new Error('Submission protection unavailable')
  return data === true
}