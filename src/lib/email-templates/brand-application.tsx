import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailHeader, brandButton, brandContainer, brandFooter, brandH1, brandMain, brandText } from './brand'

interface Props {
  heading?: string
  preview?: string
  paragraphs?: string[]
  buttonLabel?: string
  buttonUrl?: string
}

const Email = ({
  heading = 'We received your Aimanté application',
  preview = 'Your Aimanté brand application is with our team.',
  paragraphs = [],
  buttonLabel,
  buttonUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={brandMain}>
      <Container style={brandContainer}>
        <EmailHeader />
        <Heading style={brandH1}>{heading}</Heading>
        {paragraphs.map((paragraph, index) => <Text key={index} style={brandText}>{paragraph}</Text>)}
        {buttonLabel && buttonUrl && <Button style={brandButton} href={buttonUrl}>{buttonLabel}</Button>}
        <Text style={brandFooter}>Aimanté — by Gravity Pants</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => String(data['subject'] ?? 'Your Aimanté brand application'),
  displayName: 'Aimanté brand application',
  previewData: {
    subject: 'We received your Aimanté brand application',
    heading: 'Thanks for applying',
    paragraphs: ['We received your brand profile and will review it before anything appears publicly.'],
    buttonLabel: 'Browse Aimanté',
    buttonUrl: 'https://aimante.co',
  },
} satisfies TemplateEntry