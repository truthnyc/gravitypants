import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailHeader, brandButton, brandContainer, brandFooter, brandH1, brandMain, brandText } from './brand'

interface Props {
  clientEmail?: string
  clientName?: string
  plan?: string
  until?: string
  reason?: string
  adminEmail?: string
}

const Email = ({ clientEmail, clientName, plan, until, reason, adminEmail }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Client invite sent to {clientEmail || 'a new client'} — {plan || 'plan'} until {until || '—'}</Preview>
    <Body style={brandMain}>
      <Container style={brandContainer}>
        <EmailHeader />
        <Heading style={brandH1}>Client invite sent</Heading>
        <Text style={brandText}>
          An invitation email was sent to a new client with a complimentary plan:
        </Text>
        <Text style={brandText}>
          <strong>Email:</strong> {clientEmail || '—'}<br />
          <strong>Name:</strong> {clientName || '—'}<br />
          <strong>Plan:</strong> {plan || '—'}<br />
          <strong>Free until:</strong> {until || '—'}<br />
          <strong>Reason:</strong> {reason || '—'}<br />
          <strong>Invited by:</strong> {adminEmail || '—'}
        </Text>
        <Text style={brandFooter}>Gravity Pants admin · This is a copy of a client invite for your records.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Client invite: ${d['clientEmail'] || 'new client'} · ${d['plan'] || ''} until ${d['until'] || ''}`,
  displayName: 'Client invite copy (to staff)',
  to: 'help@gravitypants.com',
  previewData: { clientEmail: 'jane@example.com', clientName: 'Jane', plan: 'Business', until: '2027-01-01', reason: 'Agency partner', adminEmail: 'admin@gravitypants.com' },
} satisfies TemplateEntry
