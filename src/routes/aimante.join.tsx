import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Check, LayoutTemplate, Sparkles, Users, BadgeCheck } from 'lucide-react'
import { AimanteShell } from '@/components/site/AimanteShell'
import { Button } from '@/components/ui/button'
import { categorySlug, CATEGORIES, BRAND_DESCRIPTION_MAX, BRAND_MOODS_MAX, type Category } from '@/lib/directory/directory'
import { useMoodCatalog } from '@/lib/directory/moods'
import { brandApplicationInput, submitBrandApplication } from '@/lib/directory/applications.functions'
import { aimanteHead } from '@/lib/site/brand-site'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/aimante/join')({
  head: () => aimanteHead({ path: '/join', title: 'List your brand on Aimanté', description: 'Get your brand discovered by mood. List your reels free on Aimanté with your Gravity Pants account.' }),
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
      <ForBrands />
      <div id="apply" className="mx-auto max-w-[980px] scroll-mt-20 px-5 py-14 font-ap text-ap-ink sm:px-8 sm:py-20">
        <header className="max-w-[700px]">
          <p className="text-[13px] font-semibold uppercase text-ap-blue">List your brand</p>
          <h2 className="mt-3 text-[clamp(30px,4vw,44px)] font-semibold leading-[1.08] tracking-[-0.03em]">Bring your brand to Aimanté.</h2>
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
      </div>
      <Closing />
    </AimanteShell>
  )
}

function Field({ label, note, optional, wide, children }: { label: string; note?: string; optional?: boolean; wide?: boolean; children: React.ReactNode }) {
  return <label className={cn('space-y-1.5', wide && 'sm:col-span-2')}><span className="flex justify-between text-[14px] font-medium"><span>{label}{optional && <span className="font-normal text-ap-muted"> (optional)</span>}</span>{note && <span className="font-normal text-ap-muted nums">{note}</span>}</span>{children}</label>
}
const primary = 'inline-flex h-11 items-center justify-center rounded-lg bg-ap-blue px-5 text-[15px] font-medium text-ap-card hover:bg-ap-blue-hover'
const grey = 'inline-flex h-11 items-center justify-center rounded-lg bg-ap-panel px-5 text-[15px] font-medium text-ap-ink hover:bg-ap-hairline'
const h2 = 'text-[clamp(28px,3.4vw,40px)] font-semibold leading-[1.1] tracking-[-0.03em]'
const GETS = [
  [LayoutTemplate, 'A brand page that looks the part.', 'Your reels, your story, your link, in a clean, elegant layout.'],
  [Sparkles, 'Found by mood, not just by name.', "Shoppers looking for 'cozy' or 'elegant' find you, even if they've never heard of you."],
  [Users, 'Side by side with names people know.', 'Small makers and well-known houses share the same space and the same spotlight.'],
  [BadgeCheck, 'Free to list.', 'Your brand page is free with any Gravity Pants account. No ad budget needed.'],
] as const
const STEPS = [
  ['Make your reels with Gravity Pants', 'Bring a few photos (three is enough). Choose a style, and Gravity Pants, our studio, makes the reel.'],
  ['Create your brand page', 'Pick your category and up to three moods that fit your brand. Add a short description and your website.'],
  ['Go live on Aimanté', 'Your reels appear in the directory, in your category and moods, linking straight to you.'],
]
const PLANS = [
  { eyebrow: 'Brand page', price: 'Free', note: 'With any Gravity Pants account', items: ['Your brand page with logo, description and website link', 'One category and up to three moods', 'Up to 3 reels'] },
  { eyebrow: 'Full brand page', price: 'Included', note: 'With Simple, from $35/month', items: ['Everything in Brand page', 'Unlimited reels on your page', 'Every reel shown in mood and category search'], highlight: true },
  { eyebrow: 'Brand stats', price: 'Included', note: 'With Business and Team', items: ['Everything in Full brand page', 'Views, saves and clicks to your website', 'See which reels and moods work best'] },
]
const WHO: [string, string][] = [['Fashion', 'Fashion & Apparel'], ['Beauty', 'Beauty & Fragrance'], ['Food & Drink', 'Food & Drink'], ['Home', 'Home & Living'], ['Travel', 'Travel & Hospitality'], ['Crafts', 'Crafts & Hobbies'], ['Photography', 'Photography & Visual Arts'], ['Nonprofits', 'Nonprofit & Causes']]
const FAQ = [
  ['Do I need a Gravity Pants account?', 'Yes, your reels and your brand page live in the same account. Your first reel is free.'],
  ['Does it cost anything?', 'Listing is free. Paid Gravity Pants plans let you add more reels and see how your page performs.'],
  ['Can I change my moods or reels later?', 'Any time, from your brand page.'],
  ['Who can list a brand?', "Anyone who owns or represents it. You'll confirm that when you sign up."],
]

function ForBrands() {
  return (
    <div className="font-ap text-ap-ink">
      <section className="mx-auto grid max-w-[1200px] items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-24">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ap-blue">For brands</p>
          <h1 className="mt-3 text-[clamp(38px,5vw,60px)] font-semibold leading-[1.05] tracking-[-0.035em]">Get seen by people who'll love you.</h1>
          <p className="mt-5 max-w-[520px] text-[18px] leading-[1.5] text-ap-body">Aimanté is where shoppers browse brands by feeling. Put yours in front of them.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#apply" className={primary}>List your brand →</a>
            <Link to="/aimante/about" className={grey}>See how it looks</Link>
          </div>
        </div>
        <div className="rounded-[12px] bg-ap-panel p-6 sm:p-8">
          <div className="rounded-[12px] bg-ap-card p-6 shadow-ap-soft">
            <div className="flex items-center gap-3">
              <span className="size-11 shrink-0 rounded-full bg-ap-hairline" aria-hidden />
              <div className="min-w-0 flex-1"><p className="text-[17px] font-semibold">[Your brand]</p><p className="text-[13px] text-ap-muted">Home & Living · cozy · warm · natural</p></div>
              <span className="text-[14px] font-medium text-ap-blue">Visit →</span>
            </div>
            <p className="mt-4 text-[14px] leading-[1.5] text-ap-body">Handmade pieces for slow mornings and long evenings. Made in small batches from natural materials.</p>
            <div className="mt-5 grid grid-cols-3 gap-3">{[0, 1, 2].map((i) => <div key={i} className="aspect-[9/16] rounded-[6px] bg-ap-media" />)}</div>
            <p className="mt-4 text-center text-[12px] text-ap-muted">Reels made with Gravity Pants</p>
          </div>
        </div>
      </section>

      <section className="bg-ap-panel px-6 py-20">
        <div className="mx-auto max-w-[1200px]">
          <h2 className={`${h2} text-center`}>What you get</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {GETS.map(([Icon, t, d]) => (
              <div key={t} className="rounded-[12px] bg-ap-card p-6">
                <Icon className="size-6 text-ap-blue" strokeWidth={1.7} aria-hidden />
                <h3 className="mt-4 text-[17px] font-semibold">{t}</h3>
                <p className="mt-2 text-[15px] leading-[1.5] text-ap-body">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-6 py-20">
        <h2 className={`${h2} text-center`}>How it works</h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-3">
          {STEPS.map(([t, d], i) => (
            <li key={t}>
              <span className="grid size-9 place-items-center rounded-full bg-ap-blue text-[15px] font-semibold text-ap-card nums">{i + 1}</span>
              <h3 className="mt-4 text-[19px] font-semibold">{t}</h3>
              <p className="mt-2 text-[15px] leading-[1.5] text-ap-body">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-[1200px] px-6">
        <div className="rounded-[12px] bg-ap-soft-blue px-6 py-12 text-center sm:px-12">
          <h2 className={h2}>Why reels made with Gravity Pants</h2>
          <p className="mx-auto mt-4 max-w-[720px] text-[17px] leading-[1.55] text-ap-body">Every reel on Aimanté is made with Gravity Pants, so every brand looks professional, whatever its size. The same reels work on Instagram, TikTok, Pinterest and your website too.</p>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-6 py-20">
        <div className="text-center">
          <h2 className={h2}>Free to list. Grow with Gravity Pants.</h2>
          <p className="mx-auto mt-4 max-w-[640px] text-[17px] leading-[1.5] text-ap-body">Your brand page comes with your Gravity Pants account. Paid plans add more reels and show how your page performs.</p>
        </div>
        <div className="mt-10 grid gap-5 rounded-[12px] bg-ap-panel p-5 sm:p-8 md:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.eyebrow} className={cn('rounded-[12px] bg-ap-card p-6', p.highlight && 'ring-2 ring-ap-blue')}>
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ap-blue">{p.eyebrow}</p>
              <p className="mt-3 text-[34px] font-semibold tracking-[-0.03em]">{p.price}</p>
              <p className="text-[14px] text-ap-muted nums">{p.note}</p>
              <ul className="mt-5 space-y-2.5">
                {p.items.map((it) => <li key={it} className="flex gap-2 text-[14px] leading-[1.45] text-ap-body"><Check className="mt-0.5 size-4 shrink-0 text-ap-blue" strokeWidth={1.7} aria-hidden />{it}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-[13px] text-ap-muted">
          Listed reels must be watermark-free. Featured places in <em>Featured this week</em> are coming later.{' '}
          <a href="https://gravitypants.com/pricing" className="font-medium text-ap-blue hover:underline">See Gravity Pants plans →</a>
        </p>
      </section>

      <section className="mx-auto max-w-[1200px] px-6 pb-20 text-center">
        <h2 className={h2}>Who it's for</h2>
        <div className="mx-auto mt-8 flex max-w-[760px] flex-wrap justify-center gap-3">
          {WHO.map(([label, cat]) => (
            <Link key={label} to="/directory/category/$slug" params={{ slug: categorySlug(cat) }} className="inline-flex h-10 items-center rounded-lg bg-ap-panel px-4 text-[15px] font-medium text-ap-ink hover:bg-ap-hairline">{label}</Link>
          ))}
          <Link to="/directory" className="inline-flex h-10 items-center rounded-lg border border-ap-hairline bg-ap-card px-4 text-[15px] font-medium text-ap-ink hover:text-ap-blue">and more</Link>
        </div>
      </section>

      <section className="mx-auto max-w-[760px] px-6 pb-8">
        <h2 className={`${h2} text-center`}>Questions</h2>
        <dl className="mt-8 divide-y divide-ap-hairline border-y border-ap-hairline">
          {FAQ.map(([q, a]) => <div key={q} className="py-5"><dt className="text-[17px] font-semibold">{q}</dt><dd className="mt-1.5 text-[15px] leading-[1.5] text-ap-body">{a}</dd></div>)}
        </dl>
      </section>
    </div>
  )
}

function Closing() {
  return (
    <section className="bg-ap-panel px-6 py-20 text-center font-ap text-ap-ink">
      <h2 className="text-[clamp(30px,4vw,48px)] font-semibold tracking-[-0.035em]">Let people fall for your brand.</h2>
      <a href="#apply" className={`${primary} mt-8`}>List your brand →</a>
      <p className="mt-6 text-[13px] text-ap-muted">Already have reels? <Link to="/signin" className="text-ap-blue hover:underline">Sign in with your Gravity Pants account.</Link></p>
    </section>
  )
}
