import * as React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailHeader, brandContainer, brandFooter, brandH1, brandMain, brandText } from './brand'

interface Props { message?: string; originalMessage?: string; ticketId?: string }

const Email = ({ message, originalMessage, ticketId }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Gravity Pants replied to your message</Preview>
    <Body style={brandMain}>
      <Container style={brandContainer}>
        <EmailHeader />
        <Heading style={brandH1}>Reply from Gravity Pants</Heading>
        <Text style={{ ...brandText, whiteSpace: 'pre-wrap' }}>{message || ''}</Text>
        <Text style={brandText}><strong>Your message</strong></Text>
        <Text style={{ ...brandText, whiteSpace: 'pre-wrap' }}>{originalMessage || ''}</Text>
        <Text style={brandFooter}>Gravity Pants support · Ticket {ticketId || ''}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Reply from Gravity Pants',
  displayName: 'Support reply (to client)',
  previewData: { message: 'Thanks for your message.', originalMessage: 'Can you help with my reel?', ticketId: 'example' },
} satisfies TemplateEntry