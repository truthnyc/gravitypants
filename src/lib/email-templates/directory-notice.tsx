import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailHeader, brandButton, brandContainer, brandFooter, brandH1, brandMain, brandText } from './brand'

interface Props {
  heading?: string
  paragraphs?: string[]
  buttonLabel?: string
  buttonUrl?: string
  secondaryLabel?: string
  secondaryUrl?: string
}

/** One layout for every Directory email: reel live, reel not approved, plan-ended reminders. */
const Email = ({ heading = 'Gravity Pants Directory', paragraphs = [], buttonLabel, buttonUrl, secondaryLabel, secondaryUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{heading}</Preview>
    <Body style={brandMain}>
      <Container style={brandContainer}>
        <EmailHeader />
        <Heading style={brandH1}>{heading}</Heading>
        {paragraphs.map((p, i) => <Text key={i} style={brandText}>{p}</Text>)}
        {buttonLabel && buttonUrl && <Button style={brandButton} href={buttonUrl}>{buttonLabel}</Button>}
        {secondaryLabel && secondaryUrl && <Text style={brandText}><a href={secondaryUrl}>{secondaryLabel}</a></Text>}
        <Text style={brandFooter}>Gravity Pants · You're getting this because your brand is in the Gravity Pants Directory.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => String(d['subject'] ?? 'Gravity Pants Directory'),
  displayName: 'Directory notice',
  previewData: { subject: 'Your reel is live in the Directory', heading: 'Your reel is live in the Directory', paragraphs: ['People can now find it in search and on your brand page.'], buttonLabel: 'See your reel', buttonUrl: 'https://gravitypants.com/directory' },
} satisfies TemplateEntry
