import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Check } from 'lucide-react'
import { AimanteShell } from '@/components/site/AimanteShell'
import { Button } from '@/components/ui/button'
import { CATEGORIES, BRAND_DESCRIPTION_MAX, BRAND_MOODS_MAX, type Category } from '@/lib/directory/directory'
import { useMoodCatalog } from '@/lib/directory/moods'
import { brandApplicationInput, submitBrandApplication } from '@/lib/directory/applications.functions'
import { aimanteHead } from '@/lib/site/brand-site'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/aimante/join')({
  head: () => aimanteHead({ path: '/join', title: 'List your brand — Aimanté', description: 'Apply for an Aimanté brand page and share your short video ads with people browsing by mood, category and brand.' }),
  component: Join,
})

type Form = {
  name: string; email: string; brand: string; website: string; category: Category;
  description: string; moods: string[]; message: string; company: string; logo: File | null;
}

const empty: Form = { name: '', email: '', brand: '', website: '', category: 'Other', description: '', moods: [], message: '', company: '', logo: null }
const input = 'h-11 w-full rounded-sm border border-ap-hairline bg-ap-card px-3 text-[15px] outline-none focus:border-ap-blue focus:ring-2 focus:ring-ap-soft-blue'

async function encodeLogo(file: File | null) {
  if (!file) return null
  if (file.size > 2_000_000) throw new Error('Use a logo under 2 MB.')
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Use a PNG, JPG or WebP logo.')
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  return { base64: btoa(binary), type: file.type as 'image/png' | 'image/jpeg' | 'image/webp' }
}

function Join() {
  const submitApplication = useServerFn(submitBrandApplication)
  const moods = useMoodCatalog()
  const [form, setForm] = useState<Form>(empty)
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [confirmationSent, setConfirmationSent] = useState(false)
  const available = moods.forCategory(form.category)
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((current) => ({ ...current, [key]: value }))

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(null); setState('sending')
    try {
      const parsed = brandApplicationInput.safeParse({ ...form, logo: await encodeLogo(form.logo) })
      if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check your details.'); setState('idle'); return }
      const result = await submitApplication({ data: parsed.data })
      if ('error' in result) { setError(result.error); setState('idle'); return }
      setConfirmationSent(result.confirmationSent === true); setState('sent')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Check your details and try again.')
      setState('idle')
    }
  }

  return (
    <AimanteShell>
      <main className="mx-auto max-w-[980px] px-5 py-14 font-ap text-ap-ink sm:px-8 sm:py-20">
        <header className="max-w-[700px]">
          <p className="text-[13px] font-semibold uppercase text-ap-badge">List your brand</p>
          <h1 className="mt-3 text-[clamp(36px,5vw,58px)] font-semibold leading-[1.04]">Bring your brand to Aimanté.</h1>
          <p className="mt-5 max-w-[620px] text-[18px] leading-[1.5] text-ap-body">Share your profile with our team. We review every application before creating a public brand page.</p>
        </header>

        <section className="mt-12 border-t border-ap-hairline pt-10">
          {state === 'sent' ? (
            <div className="max-w-[620px] py-10" role="status">
              <span className="grid size-11 place-items-center rounded-full bg-ap-soft-blue text-ap-blue"><Check className="size-5" strokeWidth={1.7} /></span>
              <h2 className="mt-5 text-[28px] font-semibold">Your application is with us.</h2>
              <p className="mt-3 text-[16px] leading-[1.5] text-ap-body">{confirmationSent ? `We sent a confirmation to ${form.email}. ` : 'Your application has been saved. '}Nothing will appear publicly until our team approves and prepares the page.</p>
              <Button asChild className="mt-7"><Link to="/directory">Browse Aimanté</Link></Button>
            </div>
          ) : (
            <form onSubmit={(event) => void submit(event)} className="grid gap-x-6 gap-y-5 sm:grid-cols-2" noValidate>
              <Field label="Your name"><input className={input} required minLength={2} maxLength={120} autoComplete="name" value={form.name} onChange={(event) => set('name', event.target.value)} /></Field>
              <Field label="Email"><input className={input} required type="email" maxLength={320} autoComplete="email" value={form.email} onChange={(event) => set('email', event.target.value)} /></Field>
              <Field label="Brand name"><input className={input} required maxLength={50} autoComplete="organization" value={form.brand} onChange={(event) => set('brand', event.target.value)} /></Field>
              <Field label="Website"><input className={input} required maxLength={300} inputMode="url" placeholder="https://" value={form.website} onChange={(event) => set('website', event.target.value)} /></Field>
              <Field label="Category">
                <select className={input} value={form.category} onChange={(event) => set('category', event.target.value as Category)}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select>
              </Field>
              <Field label="Logo" note="PNG, JPG or WebP · up to 2 MB">
                <input className={cn(input, 'py-2 file:mr-3 file:border-0 file:bg-transparent file:text-[13px] file:font-medium')} required type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => set('logo', event.target.files?.[0] ?? null)} />
              </Field>
              <Field wide label="About your brand" note={`${form.description.length} / ${BRAND_DESCRIPTION_MAX}`}><textarea className={cn(input, 'h-auto min-h-28 py-3')} required minLength={20} maxLength={BRAND_DESCRIPTION_MAX} value={form.description} onChange={(event) => set('description', event.target.value)} /></Field>
              <fieldset className="sm:col-span-2">
                <legend className="text-[14px] font-medium">Moods <span className="font-normal text-ap-muted">· choose 1–{BRAND_MOODS_MAX}</span></legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {available.map((mood) => { const selected = form.moods.includes(mood); return <Button key={mood} type="button" size="sm" variant={selected ? 'primary' : 'outline'} aria-pressed={selected} disabled={!selected && form.moods.length >= BRAND_MOODS_MAX} onClick={() => set('moods', selected ? form.moods.filter((item) => item !== mood) : [...form.moods, mood])}>{mood.charAt(0).toUpperCase() + mood.slice(1)}</Button> })}
                </div>
              </fieldset>
              <Field wide label="Anything else?" optional><textarea className={cn(input, 'h-auto min-h-24 py-3')} maxLength={2000} value={form.message} onChange={(event) => set('message', event.target.value)} /></Field>
              <input className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.company} onChange={(event) => set('company', event.target.value)} />
              {error && <p className="text-[14px] text-destructive sm:col-span-2" role="alert">{error}</p>}
              <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
                <Button type="submit" size="large" disabled={state === 'sending' || form.moods.length < 1 || !form.logo}>{state === 'sending' ? 'Sending…' : 'Submit application'}</Button>
                <p className="max-w-[460px] text-[13px] leading-[1.45] text-ap-muted">Submitting does not publish your page. We review the details and contact you before it goes live.</p>
              </div>
            </form>
          )}
        </section>
      </main>
    </AimanteShell>
  )
}

function Field({ label, note, optional, wide, children }: { label: string; note?: string; optional?: boolean; wide?: boolean; children: React.ReactNode }) {
  return <label className={cn('space-y-1.5', wide && 'sm:col-span-2')}><span className="flex justify-between text-[14px] font-medium"><span>{label}{optional && <span className="font-normal text-ap-muted"> (optional)</span>}</span>{note && <span className="font-normal text-ap-muted nums">{note}</span>}</span>{children}</label>
}