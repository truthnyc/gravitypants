import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailHeader, brandButton, brandContainer, brandFooter, brandH1, brandMain, brandText } from './brand'

interface Props {
  priority?: boolean
  topic?: string
  message?: string
  fromEmail?: string
  workspaceName?: string
  planName?: string
  adUrl?: string
  attachmentUrl?: string
  ticketId?: string
}

const Email = ({ priority, topic, message, fromEmail, workspaceName, planName, adUrl, attachmentUrl, ticketId }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{priority ? 'Priority ticket' : 'New ticket'}: {topic || 'Support'} from {fromEmail || 'a customer'}</Preview>
    <Body style={brandMain}>
      <Container style={brandContainer}>
        <EmailHeader />
        <Heading style={brandH1}>{priority ? 'Priority support ticket' : 'New support ticket'}</Heading>
        <Text style={brandText}>
          <strong>Topic:</strong> {topic || '—'}<br />
          <strong>From:</strong> {fromEmail || '—'}<br />
          <strong>Workspace:</strong> {workspaceName || '—'} ({planName || '—'})<br />
          <strong>Reply by:</strong> {priority ? 'within 6 hours' : 'within 24 hours'}
        </Text>
        <Text style={{ ...brandText, whiteSpace: 'pre-wrap' as const }}>{message || ''}</Text>
        {adUrl ? <Button style={brandButton} href={adUrl}>Open the ad</Button> : null}
        {attachmentUrl ? <Text style={brandText}><a href={attachmentUrl}>View screenshot</a> (link works for 30 days)</Text> : null}
        <Text style={brandFooter}>Gravity Pants support · Ticket {ticketId || ''} · Reply to this email to answer the customer.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `${d['priority'] ? '[PRIORITY] ' : ''}Support: ${d['topic'] || 'New ticket'} from ${d['fromEmail'] || 'a customer'}`,
  displayName: 'Support ticket (to staff)',
  to: 'help@gravitypants.com',
  previewData: { priority: true, topic: 'Billing', message: 'I was charged twice.', fromEmail: 'jane@example.com', workspaceName: "Jane's team", planName: 'Team', adUrl: 'https://gravitypants.com', ticketId: 'abc' },
} satisfies TemplateEntry
