import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, fmtDateTime, PageTitle, Pill } from '@/components/admin/AdminShell'
import { approveBrandApplication, declineBrandApplication, listBrandApplications, requestBrandApplicationInfo } from '@/lib/directory/applications.functions'

export const Route = createFileRoute('/_authenticated/admin/brand-applications')({
  head: () => ({ meta: [{ title: 'Brand requests — Gravity Pants Admin' }, { name: 'description', content: 'Review private Aimanté brand requests.' }, { property: 'og:title', content: 'Brand requests — Gravity Pants Admin' }, { property: 'og:description', content: 'Review private Aimanté brand requests.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex' }] }),
  component: BrandApplications,
})

function BrandApplications() {
  const list = useServerFn(listBrandApplications)
  const approve = useServerFn(approveBrandApplication)
  const decline = useServerFn(declineBrandApplication)
  const needsInfo = useServerFn(requestBrandApplicationInfo)
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['admin', 'brand-applications'], queryFn: () => list() })
  const [tab, setTab] = useState<'pending' | 'approved' | 'declined'>('pending')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [detail, setDetail] = useState<string | null>(null)
  const rows = (query.data ?? []).filter((row) => row.status === tab)
  const refresh = () => Promise.all([client.invalidateQueries({ queryKey: ['admin', 'brand-applications'] }), client.invalidateQueries({ queryKey: ['admin', 'brand-request-count'] })])

  async function act(id: string, kind: 'approve' | 'decline' | 'info') {
    setBusy(id)
    try {
      if (kind === 'approve') await approve({ data: { id, note: notes[id] ?? '' } })
      else if (kind === 'decline') await decline({ data: { id, note: notes[id] ?? '' } })
      else await needsInfo({ data: { id, note: notes[id] ?? '' } })
      toast.success(kind === 'approve' ? 'Draft brand created' : kind === 'decline' ? 'Request declined' : 'Information requested')
      await refresh()
    } catch (error) { toast.error(error instanceof Error ? error.message : "That didn't work") }
    finally { setBusy(null) }
  }

  return <>
    <PageTitle title="Brand requests" />
    <div className="mb-5 flex gap-1" role="tablist" aria-label="Application status">
      {(['pending', 'approved', 'declined'] as const).map((status) => <Button key={status} size="sm" variant={tab === status ? 'primary' : 'plain'} role="tab" aria-selected={tab === status} onClick={() => { setTab(status); setDetail(null) }} className="capitalize">{status} <span className="tabular-nums">({query.data?.filter((row) => row.status === status).length ?? 0})</span></Button>)}
    </div>
    <div className="space-y-4">
      {rows.map((row) => <Card key={row.id}>
        <div className="grid gap-5 sm:grid-cols-[80px_minmax(0,1fr)]">
          <div className="grid size-20 place-items-center overflow-hidden rounded-sm bg-control-fill text-[20px] font-semibold text-secondary-text">{row.logo ? <img src={row.logo} alt={`${row.brand} logo`} className="size-full object-contain" /> : row.brand.slice(0, 1)}</div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h2 className="text-[18px] font-semibold">{row.brand}</h2><Pill tone={row.status === 'approved' ? 'good' : row.status === 'declined' ? 'bad' : 'accent'}>{row.status === 'pending' && row.needs_info_at ? 'Needs info' : row.status}</Pill><Button size="sm" variant="plain" className="ml-auto" aria-expanded={detail === row.id} aria-controls={`detail-${row.id}`} onClick={() => { setDetail(detail === row.id ? null : row.id); setNotes((current) => ({ ...current, [row.id]: current[row.id] ?? row.admin_note ?? '' })) }}>{detail === row.id ? 'Close details' : 'View details'}</Button></div>
            <p className="mt-1 text-[13px] text-secondary-text nums">Submitted {fmtDateTime(row.created_at)} by {row.name} · <a className="text-link" href={`mailto:${row.email}`}>{row.email}</a></p>
            {detail === row.id && <div id={`detail-${row.id}`}><div className="mt-4 grid gap-3 text-[14px] sm:grid-cols-2">
              <p><b>Category</b><br />{row.category}</p>
              <p><b>Website</b><br />{row.website ? <a href={row.website} target="_blank" rel="noreferrer" className="text-link break-all">{row.website}</a> : '—'}</p>
              <p className="sm:col-span-2"><b>About</b><br /><span className="text-secondary-text">{row.description}</span></p>
              <p className="sm:col-span-2"><b>Moods</b><br /><span className="text-secondary-text">{row.moods.join(' · ')}</span></p>
              {row.message && <p className="sm:col-span-2"><b>Message</b><br /><span className="whitespace-pre-wrap text-secondary-text">{row.message}</span></p>}
            </div>
            {row.status === 'pending' ? <div className="mt-5 space-y-2 border-t border-border pt-4">
              <label className="block text-[13px] font-medium" htmlFor={`note-${row.id}`}>Response or internal note</label>
              <textarea id={`note-${row.id}`} value={notes[row.id] ?? ''} onChange={(event) => setNotes({ ...notes, [row.id]: event.target.value })} maxLength={1000} rows={3} className="w-full rounded-sm border border-border bg-background p-2 text-[14px]" />
              <div className="flex flex-wrap gap-2"><Button size="sm" disabled={busy === row.id || !row.category} onClick={() => void act(row.id, 'approve')}>Approve and create draft</Button><Button size="sm" variant="outline" disabled={busy === row.id || (notes[row.id]?.trim().length ?? 0) < 2} onClick={() => void act(row.id, 'info')}>Needs info</Button><Button size="sm" variant="destructive-plain" disabled={busy === row.id} onClick={() => void act(row.id, 'decline')}>Decline</Button></div>
            </div> : <div className="mt-4 border-t border-border pt-4 text-[13px] text-secondary-text">Reviewed {fmtDateTime(row.reviewed_at)}{row.admin_note ? ` · ${row.admin_note}` : ''}{row.created_brand_id && <><br /><Link to="/admin/directory" className="text-link">Open the draft brand in Directory</Link></>}</div>}</div>}
          </div>
        </div>
      </Card>)}
      {query.isError && <p role="alert" className="text-destructive">Could not load requests. <Button variant="plain" onClick={() => void query.refetch()}>Try again</Button></p>}
      {!query.isLoading && !query.isError && rows.length === 0 && <Card><p className="py-8 text-center text-[14px] text-secondary-text">No {tab} requests.</p></Card>}
    </div>
  </>
}