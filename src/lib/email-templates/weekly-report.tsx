import * as React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailHeader, brandContainer, brandFooter, brandH1, brandMain, brandText } from './brand'

type Row = { label: string; value: string; prev: string }
interface Props { week?: string; rows?: Row[]; topSource?: string; topQuery?: string }

const Email = ({ week, rows = [], topSource, topQuery }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Gravity Pants weekly report {week || ''}</Preview>
    <Body style={brandMain}>
      <Container style={brandContainer}>
        <EmailHeader />
        <Heading style={brandH1}>Weekly report</Heading>
        <Text style={brandText}>{week}</Text>
        {rows.map((r) => (
          <Text key={r.label} style={{ ...brandText, margin: '0 0 8px' }}>
            <strong>{r.label}:</strong> {r.value} <span style={{ color: '#888888' }}>(week before: {r.prev})</span>
          </Text>
        ))}
        <Text style={brandText}>
          <strong>Top source:</strong> {topSource || '—'}<br />
          <strong>Top search phrase:</strong> {topQuery || '—'}
        </Text>
        <Text style={brandFooter}>Turn this email off in Admin → Analytics.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Weekly report: ${d['week'] || ''}`,
  displayName: 'Weekly admin report',
  previewData: { week: 'Sep 21 – Sep 27', rows: [{ label: 'Visitors', value: '1,240', prev: '1,010' }], topSource: 'instagram', topQuery: 'photo to video ad' },
} satisfies TemplateEntry
