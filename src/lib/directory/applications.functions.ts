import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { BRAND_DESCRIPTION_MAX, BRAND_MOODS_MAX, BRAND_NAME_MAX, CATEGORIES } from './directory'

const logoSchema = z.object({
  base64: z.string().max(3_000_000),
  type: z.enum(['image/png', 'image/jpeg', 'image/webp']),
}).nullable()

export const brandApplicationInput = z.object({
  name: z.string().trim().min(2, 'Add your name.').max(120),
  email: z.string().trim().email('Enter a valid email address.').max(320),
  brand: z.string().trim().min(1, 'Add your brand name.').max(BRAND_NAME_MAX),
  website: z.string().trim().min(1, 'Add your website.').max(300),
  category: z.enum(CATEGORIES),
  description: z.string().trim().min(20, 'Tell us a little more about your brand.').max(BRAND_DESCRIPTION_MAX),
  moods: z.array(z.string().trim().toLowerCase().min(1).max(40)).min(1, 'Choose at least one mood.').max(BRAND_MOODS_MAX),
  message: z.string().trim().max(2000).optional().default(''),
  company: z.string().max(200).optional().default(''),
  logo: logoSchema,
})

const reviewInput = z.object({ id: z.string().uuid(), note: z.string().trim().max(1000).optional().default('') })

async function assertAdmin(context: { supabase: { rpc: (name: 'is_platform_admin') => PromiseLike<{ data: unknown; error: unknown }> } }) {
  const { data, error } = await context.supabase.rpc('is_platform_admin')
  if (error || data !== true) throw new Error('Not authorized')
}

function websiteUrl(value: string) {
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`
  const parsed = new URL(candidate)
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Website must use http or https.')
  return parsed.toString()
}

export const submitBrandApplication = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => brandApplicationInput.parse(input))
  .handler(async ({ data }): Promise<{ ok: true } | { error: string }> => {
    if (data.company) return { ok: true }
    const { publicClient } = await import('@/lib/site/reels.server')
    const db = publicClient()
    const moods = [...new Set(data.moods)]
    const [{ data: validMoods }, { data: category }] = await Promise.all([
      db.from('moods').select('name').in('name', moods),
      db.from('categories').select('id').eq('name', data.category).maybeSingle(),
    ])
    if (!category || (validMoods ?? []).length !== moods.length) return { error: 'Choose a valid category and moods.' }

    const requestId = crypto.randomUUID()
    let logoUrl: string | null = null
    if (data.logo) {
      const extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[data.logo.type]
      const bytes = Uint8Array.from(atob(data.logo.base64), (character) => character.charCodeAt(0))
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
      const path = `applications/${requestId}/logo.${extension}`
      const { error } = await supabaseAdmin.storage.from('brand-assets').upload(path, bytes, { contentType: data.logo.type, upsert: false })
      if (error) return { error: "We couldn't upload that logo. Try another image." }
      logoUrl = `brand-assets:${path}`
    }

    let website: string
    try { website = websiteUrl(data.website) } catch { return { error: 'Enter a valid website address.' } }
    const { error } = await db.from('brand_requests').insert({
      id: requestId, name: data.name, email: data.email, brand: data.brand, website,
      category: data.category, description: data.description, moods, logo_url: logoUrl,
      message: data.message || null, status: 'pending',
    })
    if (error) return { error: "We couldn't send your application. Please try again." }

    try {
      const { sendTemplateEmail } = await import('@/lib/email-templates/send-email')
      await Promise.all([
        sendTemplateEmail('brand-request', 'help@gravitypants.com', {
          templateData: { name: data.name, email: data.email, brand: data.brand, website, message: `${data.category} · ${moods.join(', ')}\n\n${data.description}\n\n${data.message}` },
          idempotencyKey: `aimante-application-staff-${requestId}`, replyTo: data.email,
        }),
        sendTemplateEmail('brand-application', data.email, {
          templateData: { subject: 'We received your Aimanté brand application', heading: `Thanks, ${data.name}`, paragraphs: [`We received ${data.brand}'s profile and will review it before anything appears publicly.`, "We'll email you when the review is complete."], buttonLabel: 'Browse Aimanté', buttonUrl: 'https://aimante.co' },
          idempotencyKey: `aimante-application-confirmation-${requestId}`,
        }),
      ])
    } catch (emailError) { console.error('brand application email failed', emailError) }
    return { ok: true }
  })

export const listBrandApplications = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data, error } = await supabaseAdmin.from('brand_requests')
      .select('id,name,email,brand,website,message,category,description,moods,logo_url,status,admin_note,created_at,reviewed_at,created_brand_id')
      .not('category', 'is', null).order('created_at', { ascending: false }).limit(500)
    if (error) throw new Error(error.message)
    return Promise.all((data ?? []).map(async (row) => {
      let logo: string | null = null
      if (row.logo_url?.startsWith('brand-assets:')) {
        const { data: signed } = await supabaseAdmin.storage.from('brand-assets').createSignedUrl(row.logo_url.slice(13), 3600)
        logo = signed?.signedUrl ?? null
      }
      return { ...row, logo }
    }))
  })

export const approveBrandApplication = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => reviewInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data: request } = await supabaseAdmin.from('brand_requests').select('email,brand').eq('id', data.id).single()
    const args = data.note
      ? { _request_id: data.id, _admin_id: context.userId, _admin_note: data.note }
      : { _request_id: data.id, _admin_id: context.userId }
    const { data: brandId, error } = await supabaseAdmin.rpc('approve_brand_request', args)
    if (error) throw new Error(error.message)
    if (request) {
      try {
        const { sendTemplateEmail } = await import('@/lib/email-templates/send-email')
        await sendTemplateEmail('brand-application', request.email, { templateData: { subject: `${request.brand}'s Aimanté application was approved`, heading: 'Your application was approved', paragraphs: [`We created a draft Aimanté page for ${request.brand}. Our team will review its reels and publish the page when it is ready.`] }, idempotencyKey: `aimante-application-approved-${data.id}` })
      } catch (emailError) { console.error('brand approval email failed', emailError) }
    }
    return { brandId: String(brandId) }
  })

export const declineBrandApplication = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => reviewInput.extend({ note: z.string().trim().min(2, 'Add a short response.').max(1000) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data: request } = await supabaseAdmin.from('brand_requests').select('email,brand').eq('id', data.id).single()
    const { error } = await supabaseAdmin.rpc('decline_brand_request', { _request_id: data.id, _admin_id: context.userId, _admin_note: data.note })
    if (error) throw new Error(error.message)
    if (request) {
      try {
        const { sendTemplateEmail } = await import('@/lib/email-templates/send-email')
        await sendTemplateEmail('brand-application', request.email, { templateData: { subject: `An update on ${request.brand}'s Aimanté application`, heading: 'An update from Aimanté', paragraphs: [data.note] }, idempotencyKey: `aimante-application-declined-${data.id}` })
      } catch (emailError) { console.error('brand decline email failed', emailError) }
    }
    return { ok: true }
  })