import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import {
  EmailHeader,
  brandButton,
  brandContainer,
  brandFooter,
  brandH1,
  brandMain,
  brandText,
} from './brand'

interface Props {
  name?: string
  endDate?: string
}

const Email = ({ name, endDate }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Gravity Pants plan is cancelled</Preview>
    <Body style={brandMain}>
      <Container style={brandContainer}>
        <EmailHeader />
        <Heading style={brandH1}>Sorry to see you go</Heading>
        <Text style={brandText}>{name ? `Hi ${name}` : 'Hi there'}</Text>
        <Text style={brandText}>
          Your Gravity Pants plan is cancelled.
          {endDate
            ? ` You can keep exporting until ${endDate} — the end of the period you've paid for.`
            : ' You can keep exporting until the end of the period you’ve paid for.'}
        </Text>
        <Text style={brandText}>
          After that, your ads, photos and brand kit stay right where they are, and you can keep
          editing and previewing for free. If you change your mind, you can pick a plan again at any
          time.
        </Text>
        <Button style={brandButton} href="https://gravitypants.com/pricing">
          See Plans
        </Button>
        <Text style={brandFooter}>
          Gravity Pants · You're getting this because you have a Gravity Pants account.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Your Gravity Pants plan is cancelled',
  displayName: 'Plan cancelled',
  previewData: { name: 'Jane', endDate: '12 October 2026' },
} satisfies TemplateEntry
