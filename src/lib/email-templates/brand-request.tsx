import * as React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailHeader, brandContainer, brandFooter, brandH1, brandMain, brandText } from './brand'

interface Props { name?: string; email?: string; brand?: string; website?: string; message?: string }

const Email = ({ name, email, brand, website, message }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{brand || 'A brand'} wants a reel</Preview>
    <Body style={brandMain}>
      <Container style={brandContainer}>
        <EmailHeader />
        <Heading style={brandH1}>New brand reel request</Heading>
        <Text style={brandText}>
          <strong>Brand:</strong> {brand || '—'}<br />
          <strong>Name:</strong> {name || '—'}<br />
          <strong>Email:</strong> {email || '—'}<br />
          <strong>Website:</strong> {website || '—'}
        </Text>
        <Text style={{ ...brandText, whiteSpace: 'pre-wrap' as const }}>{message || ''}</Text>
        <Text style={brandFooter}>Sent from the Gravity Pants contact page · Reply to this email to answer.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Reel request: ${d['brand'] || 'New brand'}`,
  displayName: 'Brand reel request (to staff)',
  to: 'help@gravitypants.com',
  previewData: { name: 'Jane', email: 'jane@example.com', brand: 'Acme', website: 'https://acme.com', message: 'We would love a reel for our spring launch.' },
} satisfies TemplateEntry
